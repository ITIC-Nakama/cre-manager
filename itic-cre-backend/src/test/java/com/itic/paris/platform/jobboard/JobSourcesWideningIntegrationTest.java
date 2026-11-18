package com.itic.paris.platform.jobboard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.jobboard.external.CrossSourceDeduplicator;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.model.ExternalSourceConfig;
import com.itic.paris.platform.jobboard.external.model.ProviderApiUsage;
import com.itic.paris.platform.jobboard.external.provider.FranceTravailProvider;
import com.itic.paris.platform.jobboard.external.provider.JSearchProvider;
import com.itic.paris.platform.jobboard.external.provider.LaBonneAlternanceProvider;
import com.itic.paris.platform.jobboard.external.repository.ExternalSourceConfigRepository;
import com.itic.paris.platform.jobboard.external.repository.ProviderApiUsageRepository;
import com.itic.paris.platform.jobboard.external.service.ExternalJobSyncService;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lot 5 « sources d'offres » : dédoublonnage entre sources (entreprise + intitulé + ville), codes ROME des formations
 * ajoutés aux critères (réglage admin), agrégateur JSearch désactivé par défaut avec plafond mensuel d'appels.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "jobboard.jsearch.monthly-call-cap=2")
class JobSourcesWideningIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private ExternalJobSyncService syncService;
    @Autowired private FranceTravailProvider franceTravail;
    @Autowired private LaBonneAlternanceProvider bonneAlternance;
    @Autowired private JSearchProvider jsearch;
    @Autowired private ExternalSourceConfigRepository sourceConfigRepository;
    @Autowired private ProviderApiUsageRepository usageRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private ContractTypeRepository contractTypeRepository;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private JavaMailSender javaMailSender;

    private Admin admin;

    @BeforeEach
    void setUp() {
        admin = new Admin();
        admin.setEmail("admin.sources@itic.fr");
        admin.setFirstName("Alice");
        admin.setLastName("Sources");
        admin.setPassword(passwordEncoder.encode("Password123!"));
        admin.setEmailVerified(true);
        admin.setRole(roleRepository.findByName(RoleEnum.ADMIN));
        admin.setActive(true);
        admin = userRepository.save(admin);
    }

    @Test
    @DisplayName("Clé de dédoublonnage : sans accents, majuscules, ponctuation, écriture inclusive ni code postal ; ville comparée")
    void deduplicationKey() {
        String a = CrossSourceDeduplicator.key("ACME SAS", "Chargé(e) de recrutement H/F", "75 - PARIS 11");
        assertThat(a).isEqualTo(CrossSourceDeduplicator.key("Acme sas", "chargé de recrutement h/f", "Paris"))
                .isEqualTo(CrossSourceDeduplicator.key("Acme SAS", "Charge de recrutement - H/F", "Paris, Île-de-France"));
        assertThat(a).isNotEqualTo(CrossSourceDeduplicator.key("Acme SAS", "Chargé de recrutement H/F", "Lyon"));
        assertThat(CrossSourceDeduplicator.key(null, "Chargé de recrutement", "Paris")).isNull();
    }

    @Test
    @DisplayName("Même annonce chez deux sources (et déjà déposée par l'équipe) : gardée une seule fois")
    void crossSourceDuplicatesAreSkipped() {
        Set<String> keys = new HashSet<>();
        int[] first = syncService.persistOffers(franceTravail, List.of(
                dto("FT-1", "Acme Conseil", "Chargé de recrutement en alternance", "75 - PARIS 09")), keys);
        int[] second = syncService.persistOffers(bonneAlternance, List.of(
                dto("LBA-1", "ACME CONSEIL", "Chargé(e) de recrutement en alternance", "Paris"),
                dto("LBA-2", "Acme Conseil", "Chargé de recrutement en alternance", "Lyon")), keys);
        assertThat(first).containsExactly(1, 0, 0);
        assertThat(second).containsExactly(1, 0, 1);
        assertThat(jobOfferRepository.existsBySourceId("LBA-1")).isFalse();
        assertThat(jobOfferRepository.existsBySourceId("LBA-2")).isTrue();

        JobOffer staff = new JobOffer();
        staff.setTitle("Assistant RH alternance");
        staff.setCompany("Beta RH");
        staff.setDescription("Offre déposée par l'équipe");
        staff.setLocation("Paris");
        staff.setContractType(contractTypeRepository.findAll().get(0));
        staff.setExternalLink("https://example.org");
        jobOfferRepository.saveAndFlush(staff);
        Set<String> fromDatabase = new HashSet<>();
        for (Object[] row : jobOfferRepository.findActiveIdentities()) {
            String key = CrossSourceDeduplicator.key((String) row[0], (String) row[1], (String) row[2]);
            if (key != null) fromDatabase.add(key);
        }
        int[] third = syncService.persistOffers(franceTravail, List.of(dto("FT-2", "BETA RH", "Assistant RH alternance", "75 - Paris")), fromDatabase);
        assertThat(third).containsExactly(0, 0, 1);
    }

    @Test
    @DisplayName("Codes ROME : ceux de l'admin + ceux des formations ITIC ; réglage admin pour revenir aux seuls codes saisis")
    void formationRomeCodesWidenCriteria() throws Exception {
        ExternalSourceConfig config = new ExternalSourceConfig(FranceTravailProvider.SOURCE, true);
        config.setRomeCodes("A1203");
        sourceConfigRepository.save(config);

        List<String> widened = franceTravail.effectiveRomeCodes("A1203");
        assertThat(widened).startsWith("A1203").contains("M1805", "M1501", "D1402", "C1504");
        assertThat(widened).doesNotHaveDuplicates();

        perform(get("/jobboard/admin/external/stats"), admin)
                .andExpect(jsonPath("$.data.includeFormationRome").value(true))
                .andExpect(jsonPath("$.data.defaultZoneIleDeFrance").value(true));
        String formationCodes = JsonPath.read(json(get("/jobboard/admin/external/stats"), admin), "$.data.formationRomeCodes");
        assertThat(formationCodes).contains("M1805").contains("M1501");

        perform(put("/jobboard/admin/external/widening").contentType(MediaType.APPLICATION_JSON)
                .content("{\"includeFormationRome\":false}"), admin)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.includeFormationRome").value(false))
                .andExpect(jsonPath("$.data.defaultZoneIleDeFrance").value(true));
        assertThat(franceTravail.effectiveRomeCodes("A1203")).containsExactly("A1203");
        assertThat(franceTravail.effectiveRomeCodes(null)).isEmpty();
    }

    @Test
    @DisplayName("JSearch : désactivé par défaut (aucune clé), visible dans le panneau ; conversion d'une offre, éditeur Indeed écarté, télétravail signalé")
    void jsearchMapping() throws Exception {
        assertThat(jsearch.isEnabled()).isFalse();
        perform(get("/jobboard/admin/external/stats"), admin)
                .andExpect(jsonPath("$.data.sources[?(@.source == 'JSEARCH')].enabled").value(false));

        var job = objectMapper.readTree("""
                {"job_id":"abc123","job_title":"Alternance chargé de communication","employer_name":"Gamma",
                 "job_publisher":"Welcome to the Jungle","job_city":"Paris","job_state":"Île-de-France","job_is_remote":true,
                 "job_description":"<p>Missions</p>","job_apply_link":"https://example.org/apply","job_employment_type":"Apprenticeship",
                 "job_posted_at_datetime_utc":"2026-11-14T08:00:00.000Z"}""");
        ExternalJobOfferDTO dto = jsearch.mapJob(job);
        assertThat(dto.sourceId()).isEqualTo("JSEARCH-abc123");
        assertThat(dto.location()).isEqualTo("Paris, Île-de-France (télétravail)");
        assertThat(dto.description()).isEqualTo("Missions");
        assertThat(dto.publishedAt()).isEqualTo(Instant.parse("2026-11-14T08:00:00Z"));
        assertThat(jsearch.resolveContractType(dto.contractTypeLabel()).getLabel()).containsIgnoringCase("alternance");
        assertThat(jsearch.mapJob(objectMapper.readTree("{\"job_id\":\"x\",\"job_title\":\"Stage\",\"job_publisher\":\"Indeed\"}"))).isNull();
    }

    @Test
    @DisplayName("JSearch : plafond mensuel d'appels (2 en test) compté en base, puis plus aucun appel ce mois-ci")
    void jsearchMonthlyCap() {
        assertThat(jsearch.tryConsumeCall()).isTrue();
        assertThat(jsearch.tryConsumeCall()).isTrue();
        assertThat(jsearch.tryConsumeCall()).isFalse();
        ProviderApiUsage usage = usageRepository.findById(new ProviderApiUsage.Key(JSearchProvider.SOURCE,
                YearMonth.now(ZoneId.of("Europe/Paris")).toString())).orElseThrow();
        assertThat(usage.getCalls()).isEqualTo(2);
    }

    // ─── Outils ──────────────────────────────────────────────────────────────────────

    private static ExternalJobOfferDTO dto(String id, String company, String title, String location) {
        return new ExternalJobOfferDTO(id, title, company, "Description de l'offre", location, "Apprentissage",
                "https://example.org/" + id, null, null, Instant.now());
    }

    private String json(MockHttpServletRequestBuilder request, User as) throws Exception {
        return perform(request, as).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, User user) throws Exception {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId()).email(user.getEmail()).role(user.getRole()).lang("fr").mustChangePassword(false).build();
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAuthProvider.createToken(details).get("token")));
    }
}

package com.itic.paris.platform.jobboard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.service.ExternalJobSyncService;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.model.dtos.CreateJobOfferRequest;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.jobboard.service.ApplicationEmailExtractor;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Canal de candidature d'une offre (bouton « Postuler ») : adresse e-mail extraite de la
 * description à la création, à la modification et à l'import ; une offre staff doit avoir un
 * lien ou une adresse ; filtre staff « Sans moyen de postuler » (noApplyChannel=true).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class JobOfferApplyChannelIntegrationTest {

    /** Mot présent dans le titre des offres du test, pour les isoler des offres de seed. */
    private static final String TAG = "Quillevere";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private ContractTypeRepository contractTypeRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private ContractType contract;
    private String advisorToken;
    private String studentToken;

    @BeforeEach
    void setUp() {
        contract = contractTypeRepository.findAll().stream().findFirst().orElseGet(() -> {
            ContractType ct = new ContractType();
            ct.setLabel("CDI_APPLY_CHANNEL");
            return contractTypeRepository.save(ct);
        });

        Advisor advisor = new Advisor();
        advisor.setEmail("advisor.apply-channel@itic.fr");
        advisor.setFirstName("Nadia");
        advisor.setLastName("Conseil");
        advisor.setPassword(passwordEncoder.encode("Password123!"));
        advisor.setEmailVerified(true);
        advisor.setRole(roleRepository.findByName(RoleEnum.ADVISOR));
        advisorToken = tokenFor(userRepository.save(advisor));

        Student student = new Student();
        student.setEmail("student.apply-channel@itic.fr");
        student.setFirstName("Eva");
        student.setLastName("Etudiante");
        student.setPassword(passwordEncoder.encode("Password123!"));
        student.setEmailVerified(true);
        student.setRole(roleRepository.findByName(RoleEnum.STUDENT));
        studentToken = tokenFor(userRepository.save(student));
    }

    @Test
    @DisplayName("Extraction : première adresse de la description, en minuscules, sans la ponctuation qui suit")
    void extractorFindsFirstAddress() {
        assertThat(ApplicationEmailExtractor.extract("CV et lettre à RH.Paris@Entreprise-Test.fr. Merci !"))
                .isEqualTo("rh.paris@entreprise-test.fr");
        assertThat(ApplicationEmailExtractor.extract("Contact : jobs@a.io ou rh@b.fr")).isEqualTo("jobs@a.io");
        assertThat(ApplicationEmailExtractor.extract("Postulez via le site, aucun contact direct.")).isNull();
        assertThat(ApplicationEmailExtractor.extract("Écrire à @entreprise ou à nom@domaine")).isNull();
        assertThat(ApplicationEmailExtractor.extract(null)).isNull();
    }

    @Test
    @DisplayName("Création par le staff : l'adresse trouvée dans la description est enregistrée et exposée")
    void createExtractsEmail() throws Exception {
        String body = postOffer(request(TAG + " par mail", "Envoyez votre CV à Recrutement@Exemple-Entreprise.fr avant vendredi.", null))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        assertThat(JsonPath.<String>read(body, "$.data.emailCandidature")).isEqualTo("recrutement@exemple-entreprise.fr");
        UUID id = UUID.fromString(JsonPath.read(body, "$.data.id"));
        assertThat(jobOfferRepository.findById(id).orElseThrow().getEmailCandidature()).isEqualTo("recrutement@exemple-entreprise.fr");
    }

    @Test
    @DisplayName("Lien seul : accepté, sans adresse e-mail")
    void linkOnlyIsAccepted() throws Exception {
        String body = postOffer(request(TAG + " par lien", "Candidature sur le site de l'entreprise.", "https://exemple.fr/offre/42"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        assertThat(JsonPath.<Object>read(body, "$.data.emailCandidature")).isNull();
    }

    @Test
    @DisplayName("Ni lien ni adresse : création et modification refusées (400 job-offer-no-apply-channel)")
    void noChannelIsRejected() throws Exception {
        postOffer(request(TAG + " sans canal", "Aucun moyen de postuler indiqué.", null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("job-offer-no-apply-channel"));
        postOffer(request(TAG + " lien vide", "Aucun moyen de postuler indiqué.", "  "))
                .andExpect(status().isBadRequest());

        String body = postOffer(request(TAG + " à modifier", "Écrire à rh@exemple.fr", null))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.data.id");

        putOffer(id, request(TAG + " à modifier", "Plus d'adresse ici.", null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("job-offer-no-apply-channel"));
    }

    @Test
    @DisplayName("Modification : l'adresse est recalculée à partir de la nouvelle description")
    void updateRecomputesEmail() throws Exception {
        String body = postOffer(request(TAG + " modifiée", "Écrire à ancien@exemple.fr", null))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.data.id");

        String updated = putOffer(id, request(TAG + " modifiée", "Nouvelle adresse : Nouveau@Exemple.fr", null))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<String>read(updated, "$.data.emailCandidature")).isEqualTo("nouveau@exemple.fr");

        String linkOnly = putOffer(id, request(TAG + " modifiée", "Candidature en ligne uniquement.", "https://exemple.fr/postuler"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<Object>read(linkOnly, "$.data.emailCandidature")).isNull();
    }

    @Test
    @DisplayName("Import externe : l'adresse de la description est extraite comme pour une offre staff")
    void externalImportExtractsEmail() {
        JobOffer withEmail = ExternalJobSyncService.toJobOffer("ADZUNA", externalDto("Postuler : Talents@Agence.example.com"), contract);
        JobOffer withoutEmail = ExternalJobSyncService.toJobOffer("ADZUNA", externalDto("Postuler sur le site de l'agence."), contract);

        assertThat(withEmail.getEmailCandidature()).isEqualTo("talents@agence.example.com");
        assertThat(withEmail.getSource()).isEqualTo("ADZUNA");
        assertThat(withEmail.getExternalLink()).isEqualTo("https://agence.example.com/offre");
        assertThat(withoutEmail.getEmailCandidature()).isNull();
    }

    @Test
    @DisplayName("Côté étudiant : l'adresse de candidature est renvoyée avec l'offre")
    void studentSeesEmail() throws Exception {
        saved(TAG + " visible étudiant", "MANUAL", null, "rh@visible.fr", true);

        String body = getJson(studentToken, "/jobboard/offers?size=50&search=" + TAG);
        assertThat(JsonPath.<List<String>>read(body, "$.data.content[*].emailCandidature")).containsExactly("rh@visible.fr");
    }

    @Test
    @DisplayName("Filtre staff « Sans moyen de postuler » : ni lien (vide compris) ni adresse")
    void noApplyChannelFilter() throws Exception {
        saved(TAG + " lien", "MANUAL", "https://exemple.fr/a", null, true);
        saved(TAG + " mail", "MANUAL", null, "rh@exemple.fr", true);
        saved(TAG + " rien", "MANUAL", null, null, true);
        saved(TAG + " lien blanc", "MANUAL", "   ", null, true);
        saved(TAG + " externe rien", "FRANCE_TRAVAIL", null, null, true);

        String all = getJson(advisorToken, "/jobboard/offers/all?source=ALL&size=50&search=" + TAG);
        assertThat(titles(all)).hasSize(5);

        String none = getJson(advisorToken, "/jobboard/offers/all?source=ALL&size=50&noApplyChannel=true&search=" + TAG);
        assertThat(titles(none)).containsExactlyInAnyOrder(TAG + " rien", TAG + " lien blanc", TAG + " externe rien");

        String manualNone = getJson(advisorToken, "/jobboard/offers/all?source=MANUAL&size=50&noApplyChannel=true&search=" + TAG);
        assertThat(titles(manualNone)).containsExactlyInAnyOrder(TAG + " rien", TAG + " lien blanc");
    }

    private CreateJobOfferRequest request(String title, String description, String link) {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle(title);
        request.setCompany("Entreprise test");
        request.setDescription(description);
        request.setLocation("Paris");
        request.setContractTypeId(contract.getId());
        request.setExternalLink(link);
        return request;
    }

    private org.springframework.test.web.servlet.ResultActions postOffer(CreateJobOfferRequest request) throws Exception {
        return mockMvc.perform(post("/jobboard/offers")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    private org.springframework.test.web.servlet.ResultActions putOffer(String id, CreateJobOfferRequest request) throws Exception {
        return mockMvc.perform(put("/jobboard/offers/" + id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    private ExternalJobOfferDTO externalDto(String description) {
        return new ExternalJobOfferDTO("adzuna:" + UUID.randomUUID(), TAG + " externe", "Agence", description,
                "Lyon", "CDI", "https://agence.example.com/offre", null, null, null);
    }

    private void saved(String title, String source, String link, String email, boolean active) {
        JobOffer offer = new JobOffer();
        offer.setTitle(title);
        offer.setCompany("Entreprise test");
        offer.setDescription("Offre de test du canal de candidature");
        offer.setContractType(contract);
        offer.setSource(source);
        if (!"MANUAL".equals(source)) {
            offer.setSourceId(source.toLowerCase() + ":" + UUID.randomUUID());
        }
        offer.setExternalLink(link);
        offer.setEmailCandidature(email);
        offer.setActive(active);
        jobOfferRepository.save(offer);
    }

    private static List<String> titles(String body) {
        return JsonPath.read(body, "$.data.content[*].title");
    }

    private String getJson(String token, String url) throws Exception {
        return mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private String tokenFor(User user) {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();
        return (String) jwtAuthProvider.createToken(details).get("token");
    }
}

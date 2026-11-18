package com.itic.paris.platform.jobboard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.provider.FranceTravailProvider;
import com.itic.paris.platform.jobboard.external.provider.LaBonneAlternanceProvider;
import com.itic.paris.platform.jobboard.external.service.ExternalJobSyncService;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PR #97 — France Travail : le type de contrat vient de la NATURE du contrat (natureContrat : apprentissage et
 * professionnalisation → « Alternance »), l'intitulé ne sert qu'en secours. Les offres déjà en base sont corrigées à la
 * synchro suivante, quand l'API les renvoie (aucune requête manuelle en prod).
 */
@SpringBootTest
@Transactional
class FranceTravailNatureContratIntegrationTest {

    @Autowired private FranceTravailProvider franceTravail;
    @Autowired private LaBonneAlternanceProvider bonneAlternance;
    @Autowired private ExternalJobSyncService syncService;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private ContractTypeRepository contractTypeRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("Nature du contrat d'abord : apprentissage / professionnalisation (libellé ou code) → Alternance, même sans mot dans l'intitulé")
    void natureDecidesAlternance() {
        assertThat(FranceTravailProvider.contractTypeLabel("Contrat apprentissage", "Développeur web H/F", "CDD - 24 Mois")).isEqualTo("Alternance");
        assertThat(FranceTravailProvider.contractTypeLabel("Cont. professionnalisation", "Assistant RH", "CDD - 12 Mois")).isEqualTo("Alternance");
        assertThat(FranceTravailProvider.contractTypeLabel("Contrat d'Apprentissage", "Comptable", "CDI")).isEqualTo("Alternance");
        assertThat(FranceTravailProvider.contractTypeLabel("E2", "Vendeur", "CDD")).isEqualTo("Alternance");
        assertThat(FranceTravailProvider.contractTypeLabel("fs", "Vendeur", "CDD")).isEqualTo("Alternance");
        assertThat(FranceTravailProvider.contractTypeLabel("Contrat apprentissage", "Stage puis alternance", "CDD"))
                .as("la nature prime sur l'intitulé").isEqualTo("Alternance");
    }

    @Test
    @DisplayName("Intitulé en secours : stage, mots d'alternance ; sinon la durée (CDI, CDD) ; rien → null (type « Inconnu »)")
    void titleIsOnlyAFallback() {
        assertThat(FranceTravailProvider.contractTypeLabel("Contrat travail", "Stage développeur", "CDD - 6 Mois")).isEqualTo("Stage");
        assertThat(FranceTravailProvider.contractTypeLabel(null, "Alternant comptable", "CDD")).isEqualTo("Alternance");
        assertThat(FranceTravailProvider.contractTypeLabel("", "Apprenti boulanger", null)).isEqualTo("Alternance");
        assertThat(FranceTravailProvider.contractTypeLabel("Contrat travail", "Comptable", "CDI")).isEqualTo("CDI");
        assertThat(FranceTravailProvider.contractTypeLabel("Contrat travail", "Comptable", "CDD - 3 Mois")).isEqualTo("CDD - 3 Mois");
        assertThat(FranceTravailProvider.contractTypeLabel(null, null, null)).isNull();
    }

    @Test
    @DisplayName("Offre de l'API (JSON) : natureContrat « Contrat apprentissage » sans mot dans l'intitulé → enregistrée en Alternance")
    void apiOfferWithApprenticeshipNatureIsImportedAsAlternance() throws Exception {
        ExternalJobOfferDTO dto = franceTravail.mapOffer(mapper.readTree("""
                {"id":"197XYZ","intitule":"Développeur web H/F","natureContrat":"Contrat apprentissage",
                 "typeContratLibelle":"CDD - 24 Mois","entreprise":{"nom":"Acme"},"lieuTravail":{"libelle":"75 - PARIS 11"},
                 "description":"Description fictive"}"""));
        assertThat(dto.sourceId()).isEqualTo("ft:197XYZ");
        assertThat(dto.contractTypeLabel()).isEqualTo("Alternance");
        assertThat(franceTravail.resolveContractType(dto.contractTypeLabel()).getLabel()).isEqualTo("Alternance");

        ExternalJobOfferDTO cdi = franceTravail.mapOffer(mapper.readTree("""
                {"id":"197ABC","intitule":"Comptable","natureContrat":"Contrat travail","typeContratLibelle":"CDI",
                 "description":"Description fictive"}"""));
        assertThat(cdi.contractTypeLabel()).isEqualTo("CDI");
    }

    @Test
    @DisplayName("Déjà en base : une offre FT enregistrée en CDD que l'API classe en apprentissage passe en Alternance à la synchro suivante")
    void knownFranceTravailOfferIsRequalifiedAtNextSync() {
        JobOffer wrong = saveOffer("FRANCE_TRAVAIL", "ft:old-1", "Développeur web H/F", "CDD");
        JobOffer stillCdd = saveOffer("FRANCE_TRAVAIL", "ft:old-2", "Comptable unique", "CDD");
        JobOffer alreadyOk = saveOffer("FRANCE_TRAVAIL", "ft:old-3", "Alternant RH", "Alternance");

        int[] counts = syncService.persistOffers(franceTravail, List.of(
                dto("ft:old-1", "Développeur web H/F", "Alternance"),
                dto("ft:old-2", "Comptable unique", "CDD - 6 Mois"),
                dto("ft:old-3", "Alternant RH", "Alternance")), new HashSet<>());

        assertThat(counts).as("insérées, ignorées, doublons, requalifiées").containsExactly(0, 3, 0, 1);
        assertThat(label(wrong)).isEqualTo("Alternance");
        assertThat(label(stillCdd)).as("l'API ne la classe pas en alternance : inchangée").isEqualTo("CDD");
        assertThat(label(alreadyOk)).isEqualTo("Alternance");
    }

    @Test
    @DisplayName("Jamais l'inverse ni ailleurs : une Alternance n'est pas rétrogradée, une autre source n'est pas requalifiée")
    void requalificationIsOneWayAndFranceTravailOnly() {
        JobOffer alternance = saveOffer("FRANCE_TRAVAIL", "ft:keep-1", "Assistant commercial", "Alternance");
        JobOffer lba = saveOffer("BONNE_ALTERNANCE", "lba:keep-2", "Assistant commercial bis", "CDD");

        int[] ft = syncService.persistOffers(franceTravail, List.of(dto("ft:keep-1", "Assistant commercial", "CDI")), new HashSet<>());
        int[] other = syncService.persistOffers(bonneAlternance, List.of(dto("lba:keep-2", "Assistant commercial bis", "Alternance")), new HashSet<>());

        assertThat(ft).containsExactly(0, 1, 0, 0);
        assertThat(other).containsExactly(0, 1, 0, 0);
        assertThat(label(alternance)).isEqualTo("Alternance");
        assertThat(label(lba)).isEqualTo("CDD");
    }

    // ─── Outils ─────────────────────────────────────────────────────────────

    private ContractType type(String label) {
        return contractTypeRepository.findAll().stream().filter(t -> label.equals(t.getLabel())).findFirst().orElseThrow();
    }

    private JobOffer saveOffer(String source, String sourceId, String title, String contractLabel) {
        JobOffer o = new JobOffer();
        o.setTitle(title);
        o.setCompany("Entreprise fictive");
        o.setDescription("Description fictive");
        o.setLocation("Paris");
        o.setSource(source);
        o.setSourceId(sourceId);
        o.setExternalLink("https://example.org/" + sourceId);
        o.setContractType(type(contractLabel));
        return jobOfferRepository.saveAndFlush(o);
    }

    private String label(JobOffer o) {
        return jobOfferRepository.findById(o.getId()).orElseThrow().getContractType().getLabel();
    }

    private static ExternalJobOfferDTO dto(String sourceId, String title, String contractLabel) {
        return new ExternalJobOfferDTO(sourceId, title, "Entreprise fictive", "Description fictive", "Paris", contractLabel,
                "https://example.org/" + sourceId, null, null, null, null);
    }
}

package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import com.itic.paris.platform.cv.service.CvTemplateHelper.Segment;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.auth.core.exception.AppException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Mise en forme des puces (gras) et de la ligne entreprise, et limites des champs ajoutés pour le modèle linéaire. */
class CvTemplateHelperTest {

    private final CvTemplateHelper fmt = new CvTemplateHelper(Locale.FRENCH);

    @Test
    @DisplayName("« **texte** » devient un morceau en gras ; le reste est du texte normal")
    void richSplitsBoldPairs() {
        assertThat(fmt.rich("Prospection : **+15 %** de CA, **3** salons")).containsExactly(
                new Segment("Prospection : ", false), new Segment("+15 %", true),
                new Segment(" de CA, ", false), new Segment("3", true), new Segment(" salons", false));
    }

    @Test
    @DisplayName("Un ** isolé ou vide reste du texte ; aucun HTML n'est interprété")
    void richKeepsUnmatchedMarkersAsText() {
        assertThat(fmt.rich("Croissance **15 %")).containsExactly(new Segment("Croissance **15 %", false));
        assertThat(fmt.rich("Rien **** ici")).containsExactly(new Segment("Rien **** ici", false));
        assertThat(fmt.rich("<b>pas du HTML</b> **ok**")).containsExactly(
                new Segment("<b>pas du HTML</b> ", false), new Segment("ok", true));
        assertThat(fmt.rich("")).isEmpty();
        assertThat(CvTemplateHelper.plain("**+15 %** de CA")).isEqualTo("+15 % de CA");
    }

    @Test
    @DisplayName("Ligne entreprise : « CA … – effectif … (secteur) », chaque partie facultative")
    void companyFacts() {
        assertThat(fmt.companyFacts("3 M€", "35 collaborateurs", "Enseignement supérieur", "CA", "effectif"))
                .isEqualTo("CA 3 M€ – effectif 35 collaborateurs (Enseignement supérieur)");
        assertThat(fmt.companyFacts("", "6 collaborateurs", "", "CA", "effectif")).isEqualTo("effectif 6 collaborateurs");
        assertThat(fmt.companyFacts(null, null, "Agence immobilière", "CA", "effectif")).isEqualTo("Agence immobilière");
        assertThat(fmt.companyFacts(" ", null, null, "CA", "effectif")).isEmpty();
    }

    @Test
    @DisplayName("Validation : 4 puces de formation au plus, champs entreprise limités à 150 caractères")
    void validatorLimitsNewFields() {
        CvDraftValidator validator = new CvDraftValidator();

        CvDraftData tooManyPoints = new CvDraftData();
        CvDraftData.Formation f = new CvDraftData.Formation();
        f.setPoints(List.of("a", "b", "c", "d", "e"));
        tooManyPoints.getFormations().add(f);
        assertThatThrownBy(() -> validator.validateData(tooManyPoints))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getMessageKey()).isEqualTo(MessageKey.CV_BUILDER_TOO_MANY_POINTS);

        CvDraftData longSector = new CvDraftData();
        CvDraftData.Experience e = new CvDraftData.Experience();
        e.setSecteur("x".repeat(151));
        longSector.getExperiences().add(e);
        assertThatThrownBy(() -> validator.validateData(longSector)).isInstanceOf(AppException.class);

        CvDraftData ok = new CvDraftData();
        CvDraftData.Experience e2 = new CvDraftData.Experience();
        e2.setChiffreAffaires("3 M€");
        e2.setEffectif("35 collaborateurs");
        e2.setSecteur("Enseignement supérieur");
        ok.getExperiences().add(e2);
        CvDraftData.Formation f2 = new CvDraftData.Formation();
        f2.setPoints(new java.util.ArrayList<>(List.of("Négociation", "Gestion de projet")));
        ok.getFormations().add(f2);
        validator.validateData(ok);
        assertThat(ok.getFormations().get(0).getPoints()).hasSize(2);
    }

    @Test
    @DisplayName("CV en anglais : les types de contrat courants sont traduits, « Inconnu » n'est jamais affiché")
    void contractTypesAreTranslatedForEnglishCvs() {
        CvTemplateHelper en = new CvTemplateHelper(Locale.ENGLISH);
        assertThat(en.contractType("Alternance")).isEqualTo("Apprenticeship");
        assertThat(en.contractType("  stage ")).isEqualTo("Internship");
        assertThat(en.contractType("Contrat d’apprentissage")).isEqualTo("Apprenticeship");
        assertThat(en.contractType("Contrat de professionnalisation")).isEqualTo("Professional training contract");
        assertThat(en.contractType("CDD")).isEqualTo("Fixed-term contract");
        assertThat(en.contractType("CDI")).isEqualTo("Permanent contract");
        assertThat(en.contractType("Job étudiant")).isEqualTo("Student job");
        assertThat(en.contractType("Bénévolat")).isEqualTo("Volunteering");
        assertThat(en.contractType("Intérim")).isEqualTo("Temporary work");
        // Saisi directement en anglais, ou inconnu de la table : garde tel quel.
        assertThat(en.contractType("Graduate programme")).isEqualTo("Graduate programme");
        assertThat(en.contractType("Inconnu")).isEmpty();
        assertThat(en.contractType(null)).isEmpty();

        // CV en français : rien n'est traduit, seul « Inconnu » disparaît.
        assertThat(fmt.contractType("Alternance")).isEqualTo("Alternance");
        assertThat(fmt.contractType("inconnu")).isEmpty();
    }
}

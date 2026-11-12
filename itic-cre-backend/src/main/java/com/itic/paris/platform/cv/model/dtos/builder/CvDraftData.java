package com.itic.paris.platform.cv.model.dtos.builder;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.itic.paris.platform.cv.model.CvBuilderOptions;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Contenu structure du CV (colonne cv_drafts.data). Les champs restent permissifs (chaines vides
 * acceptees) car un brouillon est par nature incomplet ; les limites sont controlees par
 * CvDraftValidator avec des MessageKey dedies.
 */
@Data
public class CvDraftData {

    private Identite identite = new Identite();
    private String accroche = "";
    private List<Experience> experiences = new ArrayList<>();
    private List<Formation> formations = new ArrayList<>();
    private List<Projet> projets = new ArrayList<>();
    private Competences competences = new Competences();
    private List<Langue> langues = new ArrayList<>();
    private List<Certification> certifications = new ArrayList<>();
    private List<String> centresInteret = new ArrayList<>();
    private List<String> ordreSections = new ArrayList<>(CvBuilderOptions.SECTIONS);
    private List<String> sectionsMasquees = new ArrayList<>();

    @Data
    public static class Identite {
        private String prenom = "";
        private String nom = "";
        private String titre = "";
        private String email = "";
        private String telephone = "";
        private String ville = "";
        private String mobilite = "";
        private List<Lien> liens = new ArrayList<>();
        private Boolean afficherPhoto = false;
    }

    @Data
    public static class Lien {
        /** LINKEDIN | GITHUB | PORTFOLIO | AUTRE */
        private String type = "AUTRE";
        private String url = "";
    }

    @Data
    public static class Experience {
        private String id = "";
        private String poste = "";
        private String entreprise = "";
        private String ville = "";
        private String typeContrat = "";
        /** AAAA-MM */
        private String debut = "";
        private String fin;
        private Boolean enCours = false;
        /** Presentation facultative de l'entreprise, sur une ligne : "CA 3 M€ – effectif 35 collaborateurs (secteur)". */
        private String chiffreAffaires = "";
        private String effectif = "";
        private String secteur = "";
        /** Puces de realisations ; "**texte**" met en gras (resultats chiffres). */
        private List<String> points = new ArrayList<>();
        /** Proposee par le prerempli depuis une candidature au contrat valide : a confirmer par l'etudiant. */
        @JsonProperty("aConfirmer")
        private Boolean aConfirmer = false;
    }

    @Data
    public static class Formation {
        private String id = "";
        private String diplome = "";
        private String etablissement = "";
        private String ville = "";
        private String debut = "";
        private String fin = "";
        private Boolean enCours = false;
        private String mention = "";
        /** Puces facultatives (matieres, projets marquants) ; "**texte**" met en gras. */
        private List<String> points = new ArrayList<>();
    }

    @Data
    public static class Projet {
        private String id = "";
        private String nom = "";
        private String lien = "";
        private String description = "";
        private List<String> technos = new ArrayList<>();
    }

    @Data
    public static class Competences {
        private List<String> techniques = new ArrayList<>();
        private List<String> outils = new ArrayList<>();
        private List<String> savoirEtre = new ArrayList<>();
    }

    @Data
    public static class Langue {
        private String langue = "";
        /** A1 | A2 | B1 | B2 | C1 | C2 | NATIF */
        private String niveau = "";
    }

    @Data
    public static class Certification {
        private String nom = "";
        private String organisme = "";
        /** AAAA-MM */
        private String date = "";
    }
}

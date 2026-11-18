package com.itic.paris.platform.gdpr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GdprDataExportDto {

    private UserProfileData userProfile;
    private CvData cv;
    /** Brouillon de l'assistant de CV (contenu structure), null s'il n'existe pas. */
    private CvDraftData cvDraft;
    private List<ApplicationData> crmApplications;
    private List<JobApplicationData> jobboardApplications;
    private List<QuizValidationData> quizValidations;
    private List<ArticleReadData> articlesRead;
    private List<XpHistoryData> xpHistory;
    private List<ReclamationData> reclamations;
    /** Messagerie : le fil de l'etudiant avec l'equipe CRE, dans l'ordre. */
    private List<ConversationMessageData> conversation;
    /** Notes de l'equipe (1 a 5, commentaire), de la plus recente a la plus ancienne. */
    private List<RatingData> ratings;

    /** Espace entreprise : choix d'apparition et demandes d'entreprises reçues (V55). */
    private CompanySpaceData companySpace;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfileData {
        private String id;
        private String email;
        private String firstName;
        private String lastName;
        private String phoneNumber;
        private String lang;
        private String role;
        private String promotion;
        /** Code postal (carte des étudiants, V56). */
        private String postalCode;
        /** Adresse postale (V62). */
        private String addressLine1;
        private String addressLine2;
        private String city;
        private Integer xpTotal;
        private boolean privacyAccepted;
        private Instant privacyAcceptedAt;
        private String privacyPolicyVersion;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CvData {
        private String id;
        private String filePath;
        private String statut;
        private Instant uploadedAt;
        private Instant updatedAt;
        private List<String> commentes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CvDraftData {
        private String templateCode;
        private String accentColor;
        private String cvLang;
        private Instant createdAt;
        private Instant updatedAt;
        private Instant lastSubmittedAt;
        /** Sections du CV telles que saisies (identite, experiences, formations...). */
        private Object content;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApplicationData {
        private String id;
        private String entreprise;
        private String poste;
        private String typeContrat;
        private String status;
        private String lienOffre;
        private String contact;
        private String notes;
        private Instant dateCreation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobApplicationData {
        private String id;
        private String offerTitle;
        private String entreprise;
        private Instant dateCandidature;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizValidationData {
        private String quizId;
        private String articleTitle;
        private Integer score;
        private Instant dateValidation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArticleReadData {
        private String articleId;
        private String articleTitle;
        private Instant dateLecture;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class XpHistoryData {
        private Integer points;
        private String action;
        private String description;
        private Instant dateObtention;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReclamationData {
        private String id;
        private String message;
        private String status;
        private Instant dateCreation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RatingData {
        private Instant date;
        private int score;
        private String comment;
        private String author;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanySpaceData {
        /** « Apparaître dans l'Espace entreprise ». */
        private boolean visible;
        private List<CompanySpaceRequestData> requests;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanySpaceRequestData {
        private Instant date;
        private String company;
        private String formation;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationMessageData {
        private Instant date;
        /** Ecrit par l'etudiant (sinon par l'equipe CRE). */
        private boolean fromStudent;
        /** Prenom et nom de l'auteur ; « Compte supprimé » si son compte a ete supprime. */
        private String author;
        private String message;
    }
}

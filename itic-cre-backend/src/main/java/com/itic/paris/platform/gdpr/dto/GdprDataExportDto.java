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
    private List<ApplicationData> crmApplications;
    private List<JobApplicationData> jobboardApplications;
    private List<QuizValidationData> quizValidations;
    private List<ArticleReadData> articlesRead;
    private List<XpHistoryData> xpHistory;

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
}

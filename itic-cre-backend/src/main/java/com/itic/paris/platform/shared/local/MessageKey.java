package com.itic.paris.platform.shared.local;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RequiredArgsConstructor
public enum MessageKey {

    VALIDATION_FAILED("validation-failed", "Validation échouée", "Validation failed"),
    USER_NOT_FOUND("user-not-found", "Utilisateur introuvable", "User not found"),
    EMAIL_ALREADY_IN_USE("email-already-in-use", "Email déjà utilisé", "Email already in use"),
    EMAIL_OR_PASSWORD_INCORRECT("email-or-password-incorrect", "Email ou mot de passe incorrect", "Email or password incorrect"),
    EMAIL_NOT_VERIFIED("email-not-verified", "Email non vérifié", "Email not verified"),
    ROLE_NOT_FOUND("role-not-found", "Rôle introuvable", "Role not found"),
    REFRESH_TOKEN_MISSING("refresh-token-missing", "Cookie de rafraîchissement manquant", "Refresh token cookie is missing"),
    OTP_SENT("otp-sent", "OTP envoyé", "OTP sent"),
    OTP_VALIDATED("otp-validated", "OTP validé", "OTP validated"),
    OTP_NOT_FOUND("otp-not-found", "OTP introuvable", "OTP not found"),
    OTP_EXPIRED("otp-expired", "OTP expiré", "OTP expired"),
    OTP_INVALID("otp-invalid", "OTP invalide", "OTP invalid"),
    PASSWORD_RESET_SUCCESS("password-reset-success", "Mot de passe réinitialisé", "Password reset successfully"),
    PASSWORD_UPDATE_SUCCESS("password-update-success", "Mot de passe mis à jour avec succès", "Password updated successfully"),
    JOB_TITLE_REQUIRED("job-title-required", "Le poste est requis pour les conseillers", "Job title is required for advisors"),
    OTP_NOT_REQUIRED_FOR_ACCOUNT("otp-not-required-for-account",
            "La vérification OTP ne s'applique pas à ce type de compte",
            "OTP verification is not required for this account type"),
    PASSWORD_RESET_STUDENTS_ONLY("password-reset-students-only",
            "La réinitialisation par OTP est réservée aux étudiants",
            "Password reset via OTP is only available for students"),
    USE_REGISTER_FOR_STUDENTS("use-register-for-students",
            "Utilisez /auth/register pour les comptes étudiants",
            "Use /auth/register for student accounts"),
    STUDENTS_MUST_REGISTER("students-must-register",
            "Les étudiants doivent s'inscrire via /auth/register",
            "Students must register via /auth/register"),
    PASSWORD_CHANGE_REQUIRED("password-change-required", "Changement de mot de passe requis", "Password change required"),
    PASSWORD_CHANGE_NOT_REQUIRED("password-change-not-required",
            "Le changement de mot de passe n'est pas requis pour ce compte",
            "Password change is not required for this account"),
    CURRENT_PASSWORD_INCORRECT("current-password-incorrect", "Mot de passe actuel incorrect", "Current password is incorrect"),
    NEW_PASSWORD_MUST_DIFFER("new-password-must-differ",
            "Le nouveau mot de passe doit être différent de l'actuel",
            "New password must be different from the current password"),
    NOT_AUTHENTICATED("not-authenticated", "Non authentifié", "Not authenticated"),
    ACCESS_DENIED("access-denied", "Accès refusé", "Access denied"),
    UNABLE_TO_SEND_OTP_EMAIL("unable-to-send-otp-email", "Impossible d'envoyer l'email OTP", "Unable to send OTP email"),
    TOKEN_EXPIRED("token-expired", "Jeton expiré. Veuillez vous reconnecter.", "Token has expired. Please login again."),
    REFRESH_TOKEN_EXPIRED("refresh-token-expired",
            "Jeton de rafraîchissement expiré. Veuillez vous reconnecter.",
            "Refresh token has expired. Please login again."),
    INVALID_TOKEN_TYPE("invalid-token-type",
            "Type de jeton invalide. Fournissez un jeton de rafraîchissement.",
            "Invalid token type. Please provide a refresh token."),
    INVALID_REFRESH_TOKEN("invalid-refresh-token", "Jeton de rafraîchissement invalide.", "Invalid refresh token."),
    TOKEN_INVALID("token-invalid", "Jeton invalide", "Invalid token"),
    USER_NO_ROLE("user-no-role", "L'utilisateur n'a pas de rôle assigné", "User has no role assigned"),
    INVALID_REQUEST_BODY("invalid-request-body", "Corps de la requête malformé ou illisible", "Malformed or unreadable request body"),
    REQUEST_PROCESSING_FAILED("request-processing-failed", "Échec du traitement de la requête", "Request processing failed"),
    LOGOUT_SUCCESS("logout-success", "Déconnexion réussie", "Logout successful"),
    SUCCESS("success", "Succès", "Success"),
    ERROR("error", "Erreur", "Error"),
    // Jobboard messages
    CONTRACT_TYPE_NOT_FOUND("contract-type-not-found", "Type de contrat introuvable", "Contract type not found"),
    JOB_OFFER_NOT_FOUND("job-offer-not-found", "Offre d'emploi introuvable", "Job offer not found"),
    JOB_APPLICATION_NOT_FOUND("job-application-not-found", "Candidature introuvable", "Job application not found"),
    ALREADY_APPLIED("already-applied", "Vous avez déjà postuler à cette offre", "You have already applied to this job offer"),
    ADVISOR_NOT_FOUND("advisor-not-found", "Conseiller introuvable", "Advisor not found"),
    STUDENT_NOT_FOUND("student-not-found", "Étudiant introuvable", "Student not found"),
    NOT_YOUR_APPLICATION("not-your-application", "Vous ne pouvez retirer que vos propres candidatures", "You can only withdraw your own applications"),
    JOB_OFFER_CREATED("job-offer-created", "Offre d'emploi créée avec succès", "Job offer created successfully"),
    JOB_OFFER_UPDATED("job-offer-updated", "Offre d'emploi mise à jour avec succès", "Job offer updated successfully"),
    JOB_OFFER_DEACTIVATED("job-offer-deactivated", "Offre d'emploi désactivée", "Job offer deactivated"),
    JOB_OFFER_DELETED("job-offer-deleted", "Offre d'emploi supprimée", "Job offer deleted"),
    CONTRACT_TYPE_CREATED("contract-type-created", "Type de contrat créé avec succès", "Contract type created successfully"),
    CONTRACT_TYPE_LABEL_ALREADY_EXISTS("contract-type-label-already-exists", "Un type de contrat avec ce label existe déjà", "A contract type with this label already exists"),
    CONTRACT_TYPE_UPDATED("contract-type-updated", "Type de contrat mis à jour avec succès", "Contract type updated successfully"),
    CONTRACT_TYPE_DEACTIVATED("contract-type-deactivated", "Type de contrat désactivé", "Job offer deactivated"),
    CONTRACT_TYPE_DELETED("contract-type-deleted", "Type de contrat supprimé", "Contract type deleted"),
    APPLICATION_SUBMITTED("application-submitted", "Candidature soumise avec succès", "Application submitted successfully"),
    APPLICATION_WITHDRAWN("application-withdrawn", "Candidature retirée avec succès", "Application withdrawn successfully"),
    // CRM messages
    APPLICATION_NOT_FOUND("application-not-found", "Candidature introuvable", "Application not found"),
    APPLICATION_STATUS_NOT_FOUND("application-status-not-found", "Statut introuvable", "Application status not found"),
    SKILL_CATEGORY_NOT_FOUND("skill-category-not-found", "Catégorie introuvable", "Skill category not found"),
    // Gamification messages
    GRADE_NOT_FOUND("grade-not-found", "Grade introuvable", "Grade not found"),
    GAMIFICATION_CONFIG_NOT_FOUND("gamification-config-not-found", "Configuration de gamification introuvable", "Gamification configuration not found"),
    // App configuration messages
    APP_CONFIG_NOT_FOUND("app-config-not-found", "Configuration introuvable", "Configuration not found"),
    APP_CONFIG_INVALID_VALUE("app-config-invalid-value", "Valeur de configuration invalide", "Invalid configuration value"),
    // Skill tree messages
    CATEGORIE_NOT_FOUND("categorie-not-found", "Catégorie introuvable", "Category not found"),
    ARTICLE_NOT_FOUND("article-not-found", "Article introuvable", "Article not found"),
    QUIZ_NOT_FOUND("quiz-not-found", "Quiz introuvable", "Quiz not found"),
    QUIZ_ALREADY_EXISTS("quiz-already-exists", "Un quiz existe déjà pour cet article", "A quiz already exists for this article"),
    QUESTION_NOT_FOUND("question-not-found", "Question introuvable", "Question not found"),
    // Promotion messages
    PROMOTION_NOT_FOUND("promotion-not-found", "Promotion introuvable", "Promotion not found"),
    PROMOTION_NAME_ALREADY_EXISTS("promotion-name-already-exists", "Une promotion avec ce nom existe déjà", "A promotion with this name already exists"),
    // CV messages
    CV_NOT_FOUND("cv-not-found", "CV introuvable", "CV not found"),
    CV_UPLOAD_FAILED("cv-upload-failed", "Échec de l'upload du CV", "CV upload failed"),
    CV_INVALID_FILE_TYPE("cv-invalid-file-type", "Seuls les fichiers PDF sont acceptés", "Only PDF files are accepted"),
    CV_COMMENT_ADDED("cv-comment-added", "Commentaire ajouté", "Comment added"),
    CV_STATUS_UPDATED("cv-status-updated", "Statut du CV mis à jour", "CV status updated"),
    CV_STATUT_NOT_FOUND("cv-statut-not-found", "Statut CV introuvable", "CV status not found"),
    CV_STATUT_NAME_ALREADY_EXISTS("cv-statut-name-already-exists", "Un statut CV avec ce nom existe déjà", "A CV status with this name already exists");

    private static final Map<String, MessageKey> BY_KEY = Arrays.stream(values())
            .collect(Collectors.toMap(MessageKey::getKey, Function.identity()));

    @Getter
    private final String key;
    private final String fr;
    private final String en;


    public String translate(String lang) {
        return "en".equals(lang) ? en : fr;
    }

    public static MessageKey fromKey(String key) {
        if (key == null) {
            return null;
        }
        return BY_KEY.get(key);
    }
}

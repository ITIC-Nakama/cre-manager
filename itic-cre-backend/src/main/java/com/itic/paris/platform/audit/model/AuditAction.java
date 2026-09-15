package com.itic.paris.platform.audit.model;

/**
 * Liste de toutes les actions auditées sur la plateforme.
 * Regroupe les événements d'authentification, de gestion de documents, de tutoriels, etc.
 */
public enum AuditAction {
    // --- Actions d'authentification et comptes ---
    LOGIN,
    LOGOUT,
    STUDENT_REGISTERED,
    STAFF_USER_CREATED,
    USER_DELETED,
    USER_DEACTIVATED,
    USER_REACTIVATED,
    PASSWORD_CHANGED,
    PASSWORD_RESET,
    EMAIL_VERIFIED,
    // Auto-suppression de compte etudiant (RGPD, droit a l'oubli) — distincte de USER_DEACTIVATED
    // pour rester filtrable/identifiable meme une fois le compte anonymise.
    STUDENT_SELF_DELETED_GDPR,

    // --- Actions de gestion des CVs ---
    CV_UPLOADED,
    CV_VALIDATED,
    CV_REJECTED,
    CV_DELETED,
    CV_STATUS_UPDATED,
    CV_COMMENTED,

    // --- Actions de gestion des Tutoriels ---
    TUTO_CREATED,
    TUTO_UPDATED,
    TUTO_DELETED,

    // --- Actions de gestion des Promotions ---
    PROMOTION_CREATED,
    PROMOTION_UPDATED,
    PROMOTION_DELETED,
    STUDENT_REMOVED_FROM_PROMOTION,
    STUDENT_ASSIGNED_TO_PROMOTION,

    // --- Actions d'affectation conseiller ---
    STUDENT_ASSIGNED_TO_ADVISOR,
    STUDENT_REMOVED_FROM_ADVISOR,

    // --- Actions de gestion des offres d'emploi (manuelles uniquement) ---
    JOB_OFFER_CREATED,
    JOB_OFFER_UPDATED,
    JOB_OFFER_DELETED,
    JOB_OFFER_ACTIVATED,
    JOB_OFFER_DEACTIVATED,
    JOB_OFFER_WIPED,

    // --- Actions de validation des contrats étudiants (déclaratif) ---
    // APPLICATION_CONTRACT_VERIFIED/REJECTED : conservées uniquement pour la lecture des lignes
    // audit_logs historiques (renommées en VALIDATED/INVALIDATED ci-dessous, plus jamais écrites).
    APPLICATION_CONTRACT_VERIFIED,
    APPLICATION_CONTRACT_REJECTED,
    APPLICATION_CONTRACT_DECLARED_BY_ADVISOR,
    APPLICATION_CONTRACT_VALIDATED,
    APPLICATION_CONTRACT_INVALIDATED,

    // --- Autre / Action générique ---
    OTHER
}

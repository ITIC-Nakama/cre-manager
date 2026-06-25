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
    USER_UPDATED,
    USER_DELETED,
    USER_DEACTIVATED,
    USER_REACTIVATED,
    PASSWORD_CHANGED,
    PASSWORD_RESET,
    EMAIL_VERIFIED,

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

    // --- Autre / Action générique ---
    OTHER
}

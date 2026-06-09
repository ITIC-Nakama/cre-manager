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

    // --- Autre / Action générique ---
    OTHER
}

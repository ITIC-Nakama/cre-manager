package com.itic.paris.platform.reclamation.model;

public enum ReclamationStatus {
    PENDING,
    RESOLVED,
    REFUSED,
    /** Lot 10 (V64) : demande en attente reprise comme message dans la messagerie. */
    TRANSFERRED
}

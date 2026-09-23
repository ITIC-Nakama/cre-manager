package com.itic.paris.platform.alumni.model;

/** Situation professionnelle declaree par un alumni. */
public enum AlumniStatus {
    CDI(true),
    CDD(true),
    ALTERNANCE(true),
    STAGE(true),
    FREELANCE(true),
    JOB_SEARCH(false),
    TRAINING(false),
    OTHER(false);

    private final boolean working;

    AlumniStatus(boolean working) {
        this.working = working;
    }

    /** En activite : entreprise, poste et continuite de formation sont alors demandes. */
    public boolean isWorking() {
        return working;
    }
}

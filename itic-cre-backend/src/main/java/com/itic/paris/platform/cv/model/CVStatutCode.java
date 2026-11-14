package com.itic.paris.platform.cv.model;

/**
 * Code technique d'un statut de CV que le code doit reconnaitre quel que soit son nom
 * (le nom reste modifiable par l'admin). Un statut cree par l'admin n'a pas de code.
 */
public enum CVStatutCode {
    /** Le conseiller demande des corrections : tache « Corriger votre CV » cote etudiant. */
    A_CORRIGER
}

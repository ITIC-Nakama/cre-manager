import type { ApplicationRow } from '../../../types/models/Application';

export interface StudentGroup {
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string | null;
    promotion: { id: string; nom: string } | null;
    applications: ApplicationRow[];
    staleCount: number;
    underContract: boolean;
    contractNeedsVerification: boolean;
}

export function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

export function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/** Contrat validé par un conseiller et encore actif (pas de date de fin, ou date de fin pas
  * encore atteinte) — même règle que CONTRACT_STILL_ACTIVE côté backend. Sert à distinguer LE
  * contrat actuel d'un étudiant parmi d'éventuelles autres candidatures validées mais terminées. */
export function isActiveContract(app: Pick<ApplicationRow, 'status' | 'contractVerified' | 'endDate'>): boolean {
    if (!app.status.compteCommeContrat || !app.contractVerified) return false;
    if (!app.endDate) return true;
    return app.endDate >= new Date().toISOString().slice(0, 10);
}

/** Declaration "sous contrat" pas encore validee par un conseiller. */
export function isPendingValidation(app: Pick<ApplicationRow, 'status' | 'contractVerified'>): boolean {
    return app.status.compteCommeContrat && !app.contractVerified;
}

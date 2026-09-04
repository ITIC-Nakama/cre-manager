import type { ContractTypeDetail } from './JobOffer';

export interface ApplicationStatus {
    id: string;
    nom: string;
    ordre: number;
    couleur: string | null;
    gainXP: number;
    declencheAlerte: boolean;
    actif: boolean;
    /** Vrai si ce statut marque l'étudiant comme sous contrat (ex: Offre reçue) — une date de
      * début devient alors obligatoire au changement de statut (voir ContractDateGateModal). */
    compteCommeContrat: boolean;
}

export interface ContractType {
    id: string;
    label: string;
}

/** Candidature du CRM de l'étudiant connecté (espace /student/candidatures) */
export interface Candidature {
    id: string;
    entreprise: string;
    poste: string;
    typeContrat: ContractTypeDetail | null;
    lienOffre: string | null;
    offreDescription: string | null;
    offreLocation: string | null;
    offreCompanyLogoUrl: string | null;
    contact: string | null;
    notes: string | null;
    startDate: string | null;
    endDate: string | null;
    /** Vrai si un conseiller/admin a confirmé cette déclaration de contrat — faux tant qu'elle
      * reste purement déclarative de la part de l'étudiant. */
    contractVerified: boolean;
    status: ApplicationStatus;
    stale: boolean;
    viaJobboard: boolean;
    reachedStatusIds: string[];
    xpAwarded: number;
    dateCreation: string;
    dateModification: string;
}

export interface CandidaturePage {
    content: Candidature[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export interface FetchMyCandidaturesParams {
    page?: number;
    size?: number;
    search?: string;
    statusId?: string;
    typeContratId?: string;
}

export interface CandidaturePayload {
    entreprise: string;
    poste: string;
    typeContratId?: string;
    lienOffre?: string;
    contact?: string;
    notes?: string;
    startDate?: string;
    endDate?: string;
}

export interface ApplicationStudent {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string | null;
    promotion: { id: string; nom: string } | null;
    accountActive: boolean;
}

export interface ApplicationRow {
    id: string;
    student: ApplicationStudent;
    entreprise: string;
    poste: string;
    typeContrat: ContractType | null;
    lienOffre: string | null;
    offreDescription: string | null;
    offreLocation: string | null;
    offreCompanyLogoUrl: string | null;
    contact: string | null;
    notes: string | null;
    startDate: string | null;
    endDate: string | null;
    contractVerified: boolean;
    status: ApplicationStatus;
    stale: boolean;
    viaJobboard: boolean;
    dateCreation: string;
    dateModification: string;
}

export interface ApplicationPage {
    content: ApplicationRow[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export interface ApplicationListParams {
    page?: number;
    size?: number;
    search?: string;
    statusId?: string;
    promotionId?: string;
    typeContratId?: string;
    stale?: boolean;
    activeStudentsOnly?: boolean;
    advisorId?: string;
    underContract?: boolean;
    needsContractVerification?: boolean;
}

export interface StudentGroupDTO {
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

export interface ApplicationGroupedPage {
    content: StudentGroupDTO[];
    totalElements: number;
    totalPages: number;
    number: number;
}

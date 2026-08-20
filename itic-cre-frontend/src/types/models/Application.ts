import type { ContractTypeDetail } from './JobOffer';

export interface ApplicationStatus {
    id: string;
    nom: string;
    ordre: number;
    couleur: string | null;
    gainXP: number;
    declencheAlerte: boolean;
    actif: boolean;
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
    contact: string | null;
    notes: string | null;
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
    contact: string | null;
    notes: string | null;
    status: ApplicationStatus;
    stale: boolean;
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
}

export interface ApplicationGroupedPage {
    content: StudentGroupDTO[];
    totalElements: number;
    totalPages: number;
    number: number;
}

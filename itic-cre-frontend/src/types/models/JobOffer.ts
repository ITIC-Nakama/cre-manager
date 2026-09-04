export interface ContractTypeDetail {
    id: string;
    label: string;
    description: string | null;
    active: boolean;
    createdAt: string;
}

export interface SectorDetail {
    id: string;
    label: string;
    description: string | null;
    active: boolean;
    createdAt: string;
}

export interface JobOffer {
    id: string;
    title: string;
    company: string;
    description: string;
    location: string | null;
    contractType: ContractTypeDetail;
    sector: SectorDetail | null;
    externalLink: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    applicationCount: number;
    source: string;
    companyLogoUrl: string | null;
    expiresAt: string | null;
    /** Date de publication réelle chez la source externe, null pour les offres MANUAL. */
    publishedAt: string | null;
    /** Conseiller/admin ayant créé l'offre, null pour les offres externes (source != MANUAL). */
    createdByFirstName: string | null;
    createdByLastName: string | null;
}

export interface JobOfferPage {
    content: JobOffer[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export interface JobApplicationJobboard {
    id: string;
    jobOfferId: string;
    studentId: string;
    jobOfferTitle: string;
    appliedAt: string;
}

export interface JobApplicationPage {
    content: JobApplicationJobboard[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export interface JobOfferListParams {
    page?: number;
    size?: number;
    search?: string;
    contractTypeId?: string;
    sectorId?: string;
    active?: boolean;
    source?: string;
    location?: string;
    sort?: string;
}

export interface JobOfferPayload {
    title: string;
    company: string;
    description: string;
    location?: string;
    contractTypeId: string;
    sectorId?: string;
    externalLink?: string;
}

export interface ExternalSyncRun {
    startedAt: string;
    finishedAt: string | null;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    insertedCount: number;
    skippedCount: number;
    expiredCount: number;
    deletedCount: number;
}

export interface ContractTypeCount {
    label: string;
    count: number;
}

export interface ExternalSourceStat {
    source: string;
    label: string;
    enabled: boolean;
    activeOffers: number;
    /** Répartition des offres actives par type de contrat (CDI/CDD/Alternance/Stage). */
    offersByContractType: ContractTypeCount[];
    /** Pertinent pour FRANCE_TRAVAIL / BONNE_ALTERNANCE (taxonomie ROME). null = jamais configuré. */
    romeCodes: string | null;
    /** Pertinent pour FRANCE_TRAVAIL / BONNE_ALTERNANCE. */
    departments: string | null;
    /** Pertinent uniquement pour FRANCE_TRAVAIL — mutuellement exclusif avec departments côté API. */
    regions: string | null;
    /** Pertinent pour ADZUNA (pas de ROME côté Adzuna). */
    keywords: string | null;
    /** Pertinent pour ADZUNA. */
    category: string | null;
}

export interface ExternalSourceCriteriaPayload {
    romeCodes: string;
    departments: string;
    regions: string;
    keywords: string;
    category: string;
}

export interface ExternalJobboardStats {
    syncInProgress: boolean;
    scheduledSyncEnabled: boolean;
    /** Liste noire globale d'employeurs exclus (CSV), appliquée aux trois sources en une seule fois. */
    excludedEmployers: string | null;
    lastSync: ExternalSyncRun | null;
    sources: ExternalSourceStat[];
}

/** Une option d'un référentiel externe (code ROME, tag de catégorie Adzuna...). */
export interface ReferenceOption {
    value: string;
    label: string;
}

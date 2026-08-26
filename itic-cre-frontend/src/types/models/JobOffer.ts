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
}

export interface ExternalSourceStat {
    source: string;
    label: string;
    enabled: boolean;
    activeOffers: number;
}

export interface ExternalJobboardStats {
    syncInProgress: boolean;
    lastSync: ExternalSyncRun | null;
    sources: ExternalSourceStat[];
}

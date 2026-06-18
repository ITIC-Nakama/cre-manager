export interface ContractTypeDetail {
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
    externalLink: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    applicationCount: number;
}

export interface JobApplicationJobboard {
    id: string;
    jobOfferId: string;
    studentId: string;
    jobOfferTitle: string;
    appliedAt: string;
}

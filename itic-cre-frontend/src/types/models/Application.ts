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

export interface ApplicationStudent {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    promotion: { id: string; nom: string } | null;
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

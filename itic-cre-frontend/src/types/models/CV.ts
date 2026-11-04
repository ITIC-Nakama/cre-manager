/** Code technique d'un statut reconnu par l'application (le nom reste libre pour l'admin). */
export type CVStatutCode = 'A_CORRIGER';

export interface CVStatut {
    id: string;
    nom: string;
    ordre: number;
    couleur: string;
    actif: boolean;
    gainXP: number;
    code: CVStatutCode | null;
}

/** Origine du CV actif : dépôt d'un PDF ou génération par l'assistant. */
export type CVSource = 'UPLOAD' | 'BUILDER';

export interface CVStudentInfo {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string | null;
    promotion: { id: string; nom: string } | null;
}

export interface CVRow {
    id: string;
    statut: CVStatut;
    uploadedAt: string;
    updatedAt: string | null;
    url: string;
    studentId: string;
    student?: CVStudentInfo;
    source?: CVSource;
    templateCode?: string | null;
}

export interface CVPage {
    content: CVRow[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export interface CVListParams {
    page?: number;
    size?: number;
    statutId?: string;
    search?: string;
    advisorId?: string;
    starred?: boolean;
    sort?: string;
}

export interface CVStatCount {
    statutId: string;
    count: number;
}

export interface CVResponse {
    id: string;
    url: string;
    nomFichier?: string;
    uploadedAt: string;
    updatedAt: string | null;
    xpAwarded: boolean;
    statut: CVStatut;
    studentId: string;
    source?: CVSource;
    templateCode?: string | null;
}

export interface CVComment {
    id: string;
    contenu: string;
    createdAt: string;
    advisor?: {
        id: string;
        firstName: string;
        lastName: string;
        profilePicture?: string | null;
    };
}

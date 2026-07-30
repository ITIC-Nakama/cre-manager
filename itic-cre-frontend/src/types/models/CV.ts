export interface CVStatut {
    id: string;
    nom: string;
    ordre: number;
    couleur: string;
    actif: boolean;
    gainXP: number;
}

export interface CVStudentInfo {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
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

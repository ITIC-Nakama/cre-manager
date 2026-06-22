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
    student?: CVStudentInfo; // enriched on frontend from dashboard data
}

export interface CVComment {
    id: string;
    contenu: string;
    createdAt: string;
    advisor?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

import { apiClient } from '../AxiosApiClient';

export interface CVStatut {
    id: string;
    nom: string;
    couleur: string;
    ordre: number;
}

export interface StudentCV {
    id: string;
    statut: CVStatut;
    uploadedAt: string;
    updatedAt: string | null;
    url: string;
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
    };
}

export const fetchMyCv = async (): Promise<StudentCV | null> => {
    try {
        const response = await apiClient.get('/cv/me');
        return response.data.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null; // Pas de CV existant
        }
        throw error;
    }
};

export const fetchMyCvComments = async (): Promise<CVComment[]> => {
    try {
        const response = await apiClient.get('/cv/me/comments');
        return response.data.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            return []; // Pas de commentaires (ou pas de CV)
        }
        throw error;
    }
};

export const uploadMyCv = async (file: File): Promise<StudentCV> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/cv/me/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.data;
};
export const deleteMyCv = async (): Promise<void> => {
    await apiClient.delete('/cv/me');
};


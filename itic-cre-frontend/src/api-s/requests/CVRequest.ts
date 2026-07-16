import { apiClient } from '../AxiosApiClient';
import type { CVRow, CVStatut, CVComment, CVResponse } from '../../types/models/CV';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
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

/** GET /cv — lister tous les CV avec pagination (conseiller) */
export function fetchAllCVs(params: CVListParams = {}): Promise<CVPage> {
    const query: Record<string, unknown> = { page: params.page ?? 0, size: params.size ?? 20 };
    if (params.statutId) query.statutId = params.statutId;
    if (params.search)   query.search   = params.search;
    return apiClient.get('/cv', { params: query }).then(unwrap<CVPage>);
}

/** GET /cv/statuts — lister tous les statuts de CV actifs */
export function fetchCVStatuts(): Promise<CVStatut[]> {
    return apiClient.get('/cv/statuts').then((r) => unwrap<CVStatut[]>(r));
}

/** PUT /cv/statuts/{id} — mettre à jour la configuration d'un statut de CV (corps complet requis par le backend) */
export function updateCVStatutConfig(id: string, data: Omit<CVStatut, 'id'>): Promise<CVStatut> {
    return apiClient.put(`/cv/statuts/${id}`, data).then((r) => unwrap<CVStatut>(r));
}

/** PUT /cv/{cvId}/status — mettre à jour le statut d'un CV */
export function updateCVStatus(cvId: string, statutId: string): Promise<CVRow> {
    return apiClient.put(`/cv/${cvId}/status`, { statutId }).then((r) => unwrap<CVRow>(r));
}

/** POST /cv/{cvId}/comments — ajouter un commentaire sur un CV */
export function addCVComment(cvId: string, contenu: string): Promise<CVComment> {
    return apiClient.post(`/cv/${cvId}/comments`, { contenu }).then((r) => unwrap<CVComment>(r));
}

/** GET /cv/{cvId}/comments — lister les commentaires sur un CV */
export function fetchCVComments(cvId: string): Promise<CVComment[]> {
    return apiClient.get(`/cv/${cvId}/comments`).then((r) => unwrap<CVComment[]>(r));
}

/** DELETE /cv/comments/{commentId} — supprimer un commentaire */
export function deleteCVComment(commentId: string): Promise<void> {
    return apiClient.delete(`/cv/comments/${commentId}`).then(() => undefined);
}

export interface CVStatCount {
    statutId: string;
    count: number;
}

/** GET /cv/stats — obtenir le nombre de CV par statut */
export function fetchCVStats(): Promise<CVStatCount[]> {
    return apiClient.get('/cv/stats').then((r) => unwrap<CVStatCount[]>(r));
}

/** POST /cv/me/upload — déposer ou remplacer le CV de l'étudiant connecté */
export function uploadMyCV(file: File): Promise<CVResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/cv/me/upload', formData).then((r) => unwrap<CVResponse>(r));
}

/** GET /cv/me — récupérer le CV de l'étudiant connecté */
export function fetchMyCV(): Promise<CVResponse> {
    return apiClient.get('/cv/me').then((r) => unwrap<CVResponse>(r));
}

/** GET /cv/me/comments — récupérer les commentaires sur le CV de l'étudiant connecté */
export function fetchMyComments(): Promise<CVComment[]> {
    return apiClient.get('/cv/me/comments').then((r) => unwrap<CVComment[]>(r));
}

/** GET /cv/student/{studentId} — récupérer le CV d'un étudiant par son ID (conseiller) */
export function fetchCVByStudent(studentId: string): Promise<CVResponse> {
    return apiClient.get(`/cv/student/${studentId}`).then((r) => unwrap<CVResponse>(r));
}

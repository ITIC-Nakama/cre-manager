import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';
import type { CVRow, CVStatut, CVComment, CVResponse, CVPage, CVListParams, CVStatCount } from '../../types/models/CV';


/** GET /cv — lister tous les CV avec pagination (conseiller) */
export function fetchAllCVs(params: CVListParams = {}): Promise<CVPage> {
    const query: Record<string, unknown> = { page: params.page ?? 0, size: params.size ?? 20 };
    if (params.statutId) query.statutId = params.statutId;
    if (params.search)   query.search   = params.search;
    if (params.advisorId) query.advisorId = params.advisorId;
    if (params.starred !== undefined) query.starred = params.starred;
    if (params.accountActive !== undefined) query.accountActive = params.accountActive;
    if (params.underContract !== undefined) query.underContract = params.underContract;
    if (params.sort)     query.sort     = params.sort;
    return apiClient.get('/cv', { params: query }).then(unwrap<CVPage>);
}

/** GET /cv/statuts — lister tous les statuts de CV actifs */
export function fetchCVStatuts(): Promise<CVStatut[]> {
    return apiClient.get('/cv/statuts').then((r) => unwrap<CVStatut[]>(r));
}

/** PUT /cv/statuts/{id} — mettre à jour la configuration d'un statut de CV */
export function updateCVStatutConfig(id: string, data: Partial<Omit<CVStatut, 'id'>>): Promise<CVStatut> {
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

/** Filtres de la liste repris par les puces (GET /cv/stats), pour qu'une puce affiche le nombre de lignes de la liste. */
export interface CVStatsFilters {
    search?: string;
    starred?: boolean;
}

/** GET /cv/stats — nombre de CV par statut, mêmes filtres que la liste (accountActive=false : comptes désactivés ; underContract=true : étudiants sous contrat) */
export function fetchCVStats(advisorId?: string, accountActive?: boolean, underContract?: boolean,
                             filters: CVStatsFilters = {}): Promise<CVStatCount[]> {
    const params: Record<string, unknown> = {};
    if (advisorId) params.advisorId = advisorId;
    if (filters.search) params.search = filters.search;
    if (filters.starred !== undefined) params.starred = filters.starred;
    if (accountActive !== undefined) params.accountActive = accountActive;
    if (underContract !== undefined) params.underContract = underContract;
    return apiClient.get('/cv/stats', { params }).then((r) => unwrap<CVStatCount[]>(r));
}

/** POST /cv/me/upload — déposer ou remplacer le CV de l'étudiant connecté */
export function uploadMyCV(file: File): Promise<CVResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/cv/me/upload', formData).then((r) => unwrap<CVResponse>(r));
}

/** Réponse 404 de l'API (quelle que soit la forme de l'erreur remontée par axios). */
export function isNotFound(error: unknown): boolean {
    const e = error as { response?: { status?: number; data?: { statusCode?: number } }; statusCode?: number };
    return e?.response?.status === 404 || e?.statusCode === 404 || e?.response?.data?.statusCode === 404;
}

/**
 * GET /cv/me — CV de l'étudiant connecté, ou null s'il n'en a pas encore déposé.
 * Le 404 « pas encore de CV » est un état normal, pas une erreur : le traiter en erreur faisait repasser la requête
 * en chargement à chaque nouvel abonné, et « Mon CV » se démontait et se remontait en boucle.
 */
export function fetchMyCV(): Promise<CVResponse | null> {
    // 204 (corps vide) depuis le 13/11/2026 ; 404 sur les anciennes versions de l'API : dans les deux cas, pas de CV.
    return apiClient.get('/cv/me').then((r) => unwrap<CVResponse | ''>(r) || null).catch((error) => {
        if (isNotFound(error)) return null;
        throw error;
    });
}

/** GET /cv/me/comments — commentaires sur le CV de l'étudiant connecté ; liste vide s'il n'a pas de CV (404). */
export function fetchMyComments(): Promise<CVComment[]> {
    return apiClient.get('/cv/me/comments').then((r) => unwrap<CVComment[]>(r)).catch((error) => {
        if (isNotFound(error)) return [];
        throw error;
    });
}

/** GET /cv/student/{studentId} — récupérer le CV d'un étudiant par son ID (conseiller) */
export function fetchCVByStudent(studentId: string): Promise<CVResponse> {
    return apiClient.get(`/cv/student/${studentId}`).then((r) => unwrap<CVResponse>(r));
}

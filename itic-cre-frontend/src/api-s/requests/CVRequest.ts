import { apiClient } from '../AxiosApiClient';
import type { CVRow, CVStatut, CVComment } from '../../types/models/CV';

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

/** GET /cv — list all CVs paginated (advisor) */
export function fetchAllCVs(params: CVListParams = {}): Promise<CVPage> {
    const query: Record<string, unknown> = { page: params.page ?? 0, size: params.size ?? 20 };
    if (params.statutId) query.statutId = params.statutId;
    if (params.search)   query.search   = params.search;
    return apiClient.get('/cv', { params: query }).then(unwrap<CVPage>);
}

/** GET /cv/statuts — list all active CV statuses */
export function fetchCVStatuts(): Promise<CVStatut[]> {
    return apiClient.get('/cv/statuts').then((r) => unwrap<CVStatut[]>(r));
}

/** PUT /cv/{cvId}/status — update a CV's status */
export function updateCVStatus(cvId: string, statutId: string): Promise<CVRow> {
    return apiClient.put(`/cv/${cvId}/status`, { statutId }).then((r) => unwrap<CVRow>(r));
}

/** POST /cv/{cvId}/comments — add a comment to a CV */
export function addCVComment(cvId: string, contenu: string): Promise<CVComment> {
    return apiClient.post(`/cv/${cvId}/comments`, { contenu }).then((r) => unwrap<CVComment>(r));
}

/** GET /cv/{cvId}/comments — list comments on a CV */
export function fetchCVComments(cvId: string): Promise<CVComment[]> {
    return apiClient.get(`/cv/${cvId}/comments`).then((r) => unwrap<CVComment[]>(r));
}

export interface CVStatCount {
    statutId: string;
    count: number;
}

/** GET /cv/stats — get CV counts by status */
export function fetchCVStats(): Promise<CVStatCount[]> {
    return apiClient.get('/cv/stats').then((r) => unwrap<CVStatCount[]>(r));
}

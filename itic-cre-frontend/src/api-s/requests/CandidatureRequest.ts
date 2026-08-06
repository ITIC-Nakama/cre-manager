import { apiClient } from '../AxiosApiClient';
import type { Candidature, CandidaturePayload, CandidaturePage, FetchMyCandidaturesParams } from '../../types/models/Application';

export type { FetchMyCandidaturesParams };

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export function fetchMyCandidatures(params: FetchMyCandidaturesParams = {}): Promise<CandidaturePage> {
    const query: Record<string, unknown> = {
        page: params.page ?? 0,
        size: params.size ?? 12,
    };
    if (params.search) query.search = params.search;
    if (params.statusId) query.statusId = params.statusId;
    if (params.typeContratId) query.typeContratId = params.typeContratId;

    return apiClient.get('/applications', { params: query }).then((response) => unwrap<CandidaturePage>(response));
}

export function fetchCandidatureById(id: string): Promise<Candidature> {
    return apiClient.get(`/applications/${id}`).then((response) => unwrap<Candidature>(response));
}

export function createCandidature(payload: CandidaturePayload): Promise<Candidature> {
    return apiClient.post('/applications', payload).then((response) => unwrap<Candidature>(response));
}

export function updateCandidature(id: string, payload: CandidaturePayload): Promise<Candidature> {
    return apiClient.put(`/applications/${id}`, payload).then((response) => unwrap<Candidature>(response));
}

export function changeCandidatureStatus(id: string, statusId: string): Promise<Candidature> {
    return apiClient.patch(`/applications/${id}/status`, { statusId }).then((response) => unwrap<Candidature>(response));
}

export function deleteCandidature(id: string): Promise<void> {
    return apiClient.delete(`/applications/${id}`).then(() => undefined);
}

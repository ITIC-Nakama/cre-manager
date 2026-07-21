import { apiClient } from '../AxiosApiClient';
import type { Candidature, CandidaturePayload } from '../../types/models/Application';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export interface CandidaturePage {
    content: Candidature[];
    totalElements: number;
    totalPages: number;
    number: number;
}

// L'étudiant ne suit qu'un petit nombre de candidatures — on récupère tout en une
// page pour gérer les onglets "En cours"/"Terminées" côté client (cf. fetchMyJobApplications).
export function fetchMyCandidatures(): Promise<CandidaturePage> {
    return apiClient.get('/applications', { params: { size: 100 } }).then((response) => unwrap<CandidaturePage>(response));
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

import { apiClient } from '../AxiosApiClient';
import type {
    Reclamation, ReclamationPage, CreateReclamationPayload, FetchReclamationsParams, ReclamationFormContext,
    AdvisorReclamation, AdvisorReclamationPage, FetchAdvisorReclamationsParams,
} from '../../types/models/Reclamation';

export type { FetchReclamationsParams, FetchAdvisorReclamationsParams };

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export function fetchReclamationFormContext(): Promise<ReclamationFormContext> {
    return apiClient.get('/reclamations/form-context').then((response) => unwrap<ReclamationFormContext>(response));
}

export function createReclamation(payload: CreateReclamationPayload): Promise<Reclamation> {
    return apiClient.post('/reclamations', payload).then((response) => unwrap<Reclamation>(response));
}

export function fetchMyReclamations(params: FetchReclamationsParams = {}): Promise<ReclamationPage> {
    return apiClient
        .get('/reclamations', { params: { page: params.page ?? 0, size: params.size ?? 10 } })
        .then((response) => unwrap<ReclamationPage>(response));
}

export function deleteReclamation(id: string): Promise<void> {
    return apiClient.delete(`/reclamations/${id}`).then(() => undefined);
}

// ─── Conseiller / admin ─────────────────────────────────────────────────────

export function fetchAdvisorReclamations(params: FetchAdvisorReclamationsParams = {}): Promise<AdvisorReclamationPage> {
    const query: Record<string, unknown> = { page: params.page ?? 0, size: params.size ?? 15 };
    if (params.status !== undefined) query.status = params.status;
    return apiClient.get('/dashboard/reclamations', { params: query }).then((response) => unwrap<AdvisorReclamationPage>(response));
}

export function fetchPendingReclamationsCount(): Promise<number> {
    return apiClient.get('/dashboard/reclamations/pending-count').then((response) => unwrap<number>(response));
}

export function resolveReclamation(id: string): Promise<AdvisorReclamation> {
    return apiClient.patch(`/dashboard/reclamations/${id}/resolve`).then((response) => unwrap<AdvisorReclamation>(response));
}

export function refuseReclamation(id: string): Promise<AdvisorReclamation> {
    return apiClient.patch(`/dashboard/reclamations/${id}/refuse`).then((response) => unwrap<AdvisorReclamation>(response));
}

export function reopenReclamation(id: string): Promise<AdvisorReclamation> {
    return apiClient.patch(`/dashboard/reclamations/${id}/reopen`).then((response) => unwrap<AdvisorReclamation>(response));
}

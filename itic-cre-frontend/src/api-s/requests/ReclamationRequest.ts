import { apiClient } from '../AxiosApiClient';
import type { Reclamation, ReclamationPage, CreateReclamationPayload, FetchReclamationsParams } from '../../types/models/Reclamation';

export type { FetchReclamationsParams };

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
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

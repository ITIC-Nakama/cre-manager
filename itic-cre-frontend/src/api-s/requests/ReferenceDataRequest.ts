import { apiClient } from '../AxiosApiClient';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export interface ReferenceDataPayload {
    label: string;
    description?: string;
    active?: boolean;
}

export const SECTORS_BASE_PATH = '/jobboard/sectors';
export const CONTRACT_TYPES_BASE_PATH = '/jobboard/contract-types';

export function fetchAllReferenceData<T>(basePath: string): Promise<T[]> {
    return apiClient.get(basePath).then((response) => unwrap<T[]>(response));
}

export function createReferenceData<T>(basePath: string, payload: ReferenceDataPayload): Promise<T> {
    return apiClient.post(basePath, payload).then((response) => unwrap<T>(response));
}

export function updateReferenceData<T>(basePath: string, id: string, payload: ReferenceDataPayload): Promise<T> {
    return apiClient.put(`${basePath}/${id}`, payload).then((response) => unwrap<T>(response));
}

export function deleteReferenceData(basePath: string, id: string): Promise<void> {
    return apiClient.delete(`${basePath}/${id}`).then(() => undefined);
}

export function deactivateReferenceData(basePath: string, id: string): Promise<void> {
    return apiClient.put(`${basePath}/${id}/deactivate`).then(() => undefined);
}

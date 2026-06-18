import { apiClient } from '../AxiosApiClient';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export interface Promotion {
    id: string;
    name: string;
    year: string | null;
}

export function fetchPromotions(): Promise<Promotion[]> {
    return apiClient.get('/promotions').then((response) => unwrap<Promotion[]>(response));
}

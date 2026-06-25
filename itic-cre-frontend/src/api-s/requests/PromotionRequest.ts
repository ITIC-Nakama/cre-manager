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

export interface PromotionData {
    name: string;
    year?: string;
}

export function fetchPromotions(): Promise<Promotion[]> {
    return apiClient.get('/promotions').then((response) => unwrap<Promotion[]>(response));
}

export function createPromotion(data: PromotionData): Promise<Promotion> {
    return apiClient.post('/promotions', data).then((response) => unwrap<Promotion>(response));
}

export function updatePromotion(id: string, data: PromotionData): Promise<Promotion> {
    return apiClient.put(`/promotions/${id}`, data).then((response) => unwrap<Promotion>(response));
}

export function deletePromotion(id: string): Promise<void> {
    return apiClient.delete(`/promotions/${id}`).then(() => undefined);
}

export function removeStudentFromPromotion(promotionId: string, studentId: string): Promise<void> {
    return apiClient.delete(`/promotions/${promotionId}/students/${studentId}`).then(() => undefined);
}

import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';
import type { Promotion, PromotionData } from '../../types/models/Promotion';

export function fetchPromotions(): Promise<Promotion[]> {
    return apiClient.get('/promotions').then((response) => unwrap<Promotion[]>(response));
}

export function fetchAvailableStudyYears(): Promise<number[]> {
    return apiClient.get('/promotions/available-years').then((response) => unwrap<number[]>(response));
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

export function assignStudentToPromotion(promotionId: string, studentId: string, studyYear?: number): Promise<void> {
    const params = studyYear !== undefined && studyYear !== null ? { studyYear } : undefined;
    return apiClient.put(`/promotions/${promotionId}/students/${studentId}`, null, { params }).then(() => undefined);
}

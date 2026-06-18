import { apiClient } from '../AxiosApiClient';
import type { JobOffer, JobApplicationJobboard } from '../../types/models/JobOffer';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export interface JobOfferPage {
    content: JobOffer[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export interface JobApplicationPage {
    content: JobApplicationJobboard[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export interface JobOfferListParams {
    page?: number;
    size?: number;
    search?: string;
    contractTypeId?: string;
}

export interface JobOfferPayload {
    title: string;
    company: string;
    description: string;
    location?: string;
    contractTypeId: string;
    externalLink?: string;
}

// Advisor/admin — toutes les offres (actives + inactives)
export function fetchAllJobOffers(params: JobOfferListParams = {}): Promise<JobOfferPage> {
    return apiClient.get('/jobboard/offers/all', { params }).then((response) => unwrap<JobOfferPage>(response));
}

// Etudiant — offres actives uniquement
export function fetchActiveJobOffers(params: JobOfferListParams = {}): Promise<JobOfferPage> {
    return apiClient.get('/jobboard/offers', { params }).then((response) => unwrap<JobOfferPage>(response));
}

export function createJobOffer(payload: JobOfferPayload): Promise<JobOffer> {
    return apiClient.post('/jobboard/offers', payload).then((response) => unwrap<JobOffer>(response));
}

export function updateJobOffer(id: string, payload: JobOfferPayload): Promise<JobOffer> {
    return apiClient.put(`/jobboard/offers/${id}`, payload).then((response) => unwrap<JobOffer>(response));
}

export function deactivateJobOffer(id: string): Promise<void> {
    return apiClient.put(`/jobboard/offers/${id}/deactivate`).then(() => undefined);
}

export function activateJobOffer(id: string): Promise<void> {
    return apiClient.put(`/jobboard/offers/${id}/activate`).then(() => undefined);
}

export function deleteJobOffer(id: string): Promise<void> {
    return apiClient.delete(`/jobboard/offers/${id}`).then(() => undefined);
}

export function applyToJobOffer(jobOfferId: string): Promise<JobApplicationJobboard> {
    return apiClient.post(`/jobboard/applications/${jobOfferId}/apply`).then((response) => unwrap<JobApplicationJobboard>(response));
}

export function fetchMyJobApplications(): Promise<JobApplicationPage> {
    return apiClient
        .get('/jobboard/applications/my-applications', { params: { size: 200 } })
        .then((response) => unwrap<JobApplicationPage>(response));
}

export function withdrawJobApplication(id: string): Promise<void> {
    return apiClient.delete(`/jobboard/applications/${id}/withdraw`).then(() => undefined);
}

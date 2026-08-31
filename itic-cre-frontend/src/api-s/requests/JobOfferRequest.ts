import { apiClient } from '../AxiosApiClient';
import type {
    JobOffer,
    JobApplicationJobboard,
    JobOfferPage,
    JobApplicationPage,
    JobOfferListParams,
    JobOfferPayload,
    ExternalJobboardStats,
    ExternalSourceCriteriaPayload,
    SectorDetail,
    ReferenceOption,
} from '../../types/models/JobOffer';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export function fetchSectors(): Promise<SectorDetail[]> {
    return apiClient.get('/jobboard/sectors/active/list').then((response) => unwrap<SectorDetail[]>(response));
}

export function createSector(label: string): Promise<SectorDetail> {
    return apiClient.post('/jobboard/sectors', { label }).then((response) => unwrap<SectorDetail>(response));
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

// Admin — purge en masse (MANUAL, EXTERNAL ou ALL)
export function wipeJobOffers(scope: 'MANUAL' | 'EXTERNAL' | 'ALL'): Promise<void> {
    return apiClient.delete('/jobboard/offers/wipe', { params: { scope } }).then(() => undefined);
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

// Admin — jobboard externe
export function fetchExternalJobboardStats(): Promise<ExternalJobboardStats> {
    return apiClient
        .get('/jobboard/admin/external/stats')
        .then((response) => unwrap<ExternalJobboardStats>(response));
}

export function triggerExternalJobboardSync(): Promise<void> {
    return apiClient.post('/jobboard/admin/external/sync').then(() => undefined);
}

export function toggleExternalJobboardSource(source: string): Promise<ExternalJobboardStats> {
    return apiClient
        .put(`/jobboard/admin/external/sources/${source}/toggle`)
        .then((response) => unwrap<ExternalJobboardStats>(response));
}

export function updateExternalSourceCriteria(source: string, criteria: ExternalSourceCriteriaPayload): Promise<ExternalJobboardStats> {
    return apiClient
        .put(`/jobboard/admin/external/sources/${source}/criteria`, criteria)
        .then((response) => unwrap<ExternalJobboardStats>(response));
}

export function fetchRomeCodesReference(): Promise<ReferenceOption[]> {
    return apiClient
        .get('/jobboard/admin/external/reference/rome-codes')
        .then((response) => unwrap<ReferenceOption[]>(response));
}

export function fetchAdzunaCategoriesReference(): Promise<ReferenceOption[]> {
    return apiClient
        .get('/jobboard/admin/external/reference/adzuna-categories')
        .then((response) => unwrap<ReferenceOption[]>(response));
}

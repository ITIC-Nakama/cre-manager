import { apiClient } from '../AxiosApiClient';
import type {
    ApplicationStatus,
    ContractType,
    ApplicationPage,
    ApplicationListParams,
    ApplicationGroupedPage,
    Candidature,
} from '../../types/models/Application';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export function fetchApplicationList(params: ApplicationListParams = {}): Promise<ApplicationPage> {
    return apiClient.get('/dashboard/applications', { params }).then((response) => unwrap<ApplicationPage>(response));
}

export function fetchApplicationGroupedList(params: ApplicationListParams = {}): Promise<ApplicationGroupedPage> {
    return apiClient.get('/dashboard/applications/grouped-by-student', { params }).then((response) => unwrap<ApplicationGroupedPage>(response));
}

export function fetchApplicationStatuses(): Promise<ApplicationStatus[]> {
    return apiClient.get('/application-statuses').then((response) => unwrap<ApplicationStatus[]>(response));
}

export function updateApplicationStatus(id: string, data: { gainXP?: number; couleur?: string }): Promise<ApplicationStatus> {
    return apiClient.put(`/application-statuses/${id}`, data).then((response) => unwrap<ApplicationStatus>(response));
}

export function fetchContractTypes(): Promise<ContractType[]> {
    return apiClient.get('/jobboard/contract-types/active/list').then((response) => unwrap<ContractType[]>(response));
}

/** Ouvert a tout conseiller/admin, pas seulement celui affecte a l'etudiant. */
export function updateApplicationContractDates(
    id: string,
    payload: { startDate?: string | null; endDate?: string | null },
): Promise<Candidature> {
    return apiClient.patch(`/dashboard/applications/${id}/contract-dates`, payload).then((response) => unwrap<Candidature>(response));
}

/** Valide une déclaration "sous contrat" déjà exacte, sans toucher aux dates. */
export function validateApplicationContract(id: string): Promise<Candidature> {
    return apiClient.post(`/dashboard/applications/${id}/validate-contract`).then((response) => unwrap<Candidature>(response));
}

/** Invalide une déclaration "sous contrat" (en attente, ou déjà validée) — revient au statut précédent et annule l'XP devenu invalide. */
export function invalidateApplicationContract(id: string): Promise<Candidature> {
    return apiClient.post(`/dashboard/applications/${id}/invalidate-contract`).then((response) => unwrap<Candidature>(response));
}

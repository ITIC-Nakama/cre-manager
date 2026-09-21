import { apiClient } from '../AxiosApiClient';
import type {
    ApplicationStatus,
    ContractType,
    ApplicationPage,
    ApplicationListParams,
    ApplicationGroupedPage,
    Candidature,
    CandidaturePayload,
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

/** Cree une candidature au nom d'un etudiant (demarchage CRE) — ouvert a tout conseiller/admin, pas seulement celui affecte a l'etudiant. */
export function createApplicationForStudent(studentId: string, payload: CandidaturePayload): Promise<Candidature> {
    return apiClient.post(`/dashboard/students/${studentId}/applications`, payload).then((response) => unwrap<Candidature>(response));
}

/** Modifie une candidature creee par un conseiller/admin — reserve a celles qu'il a lui-meme creees. */
export function updateApplicationAsAdvisor(id: string, payload: CandidaturePayload): Promise<Candidature> {
    return apiClient.patch(`/dashboard/applications/${id}`, payload).then((response) => unwrap<Candidature>(response));
}

/** Supprime une candidature creee par un conseiller/admin — reserve a celles qu'il a lui-meme creees, silencieux (pas d'email). */
export function deleteApplicationAsAdvisor(id: string): Promise<void> {
    return apiClient.delete(`/dashboard/applications/${id}`).then(() => undefined);
}

/** Change le statut d'une candidature creee par un conseiller/admin — reserve a celles qu'il a lui-meme creees. */
export function changeApplicationStatusAsAdvisor(
    id: string,
    statusId: string,
    startDate?: string,
    endDate?: string,
    contractTypeId?: string,
): Promise<Candidature> {
    return apiClient.patch(`/dashboard/applications/${id}/status`, { statusId, startDate, endDate, contractTypeId }).then((response) => unwrap<Candidature>(response));
}

import { apiClient } from '../AxiosApiClient';
import type { ApplicationRow, ApplicationStatus, ContractType } from '../../types/models/Application';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export interface ApplicationPage {
    content: ApplicationRow[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export interface ApplicationListParams {
    page?: number;
    size?: number;
    search?: string;
    statusId?: string;
    promotionId?: string;
    typeContratId?: string;
    stale?: boolean;
}

export function fetchApplicationList(params: ApplicationListParams = {}): Promise<ApplicationPage> {
    return apiClient.get('/dashboard/applications', { params }).then((response) => unwrap<ApplicationPage>(response));
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

export interface ApplicationFormData {
    entreprise: string;
    poste: string;
    typeContratId?: string;
    lienOffre?: string;
    contact?: string;
    notes?: string;
}

export function fetchMyApplications(params: ApplicationListParams = {}): Promise<ApplicationPage> {
    return apiClient.get('/applications', { params }).then((response) => unwrap<ApplicationPage>(response));
}

export function createApplication(data: ApplicationFormData): Promise<ApplicationRow> {
    return apiClient.post('/applications', data).then((response) => unwrap<ApplicationRow>(response));
}

export function updateApplication(id: string, data: ApplicationFormData): Promise<ApplicationRow> {
    return apiClient.put(`/applications/${id}`, data).then((response) => unwrap<ApplicationRow>(response));
}

export function changeApplicationStatus(id: string, statusId: string): Promise<ApplicationRow> {
    return apiClient.patch(`/applications/${id}/status`, { statusId }).then((response) => unwrap<ApplicationRow>(response));
}

export function deleteApplication(id: string): Promise<void> {
    return apiClient.delete(`/applications/${id}`);
}

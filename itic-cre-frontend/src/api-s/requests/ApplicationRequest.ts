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

export function fetchContractTypes(): Promise<ContractType[]> {
    return apiClient.get('/jobboard/contract-types/active/list').then((response) => unwrap<ContractType[]>(response));
}

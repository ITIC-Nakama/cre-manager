import { apiClient } from '../AxiosApiClient';
import type {
    ApplicationStatus,
    ContractType,
    ApplicationPage,
    ApplicationListParams,
    ApplicationGroupedPage,
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

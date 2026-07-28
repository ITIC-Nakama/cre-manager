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

export interface ApplicationStudent {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string | null;
    promotion: { id: string; nom: string } | null;
    accountActive: boolean;
}


export interface ApplicationListParams {
    page?: number;
    size?: number;
    search?: string;
    statusId?: string;
    promotionId?: string;
    typeContratId?: string;
    stale?: boolean;
    activeStudentsOnly?: boolean;
}

export interface StudentGroupDTO {
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string | null;
    promotion: { id: string; nom: string } | null;
    applications: ApplicationRow[];
    staleCount: number;
}

export interface ApplicationGroupedPage {
    content: StudentGroupDTO[];
    totalElements: number;
    totalPages: number;
    number: number;
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

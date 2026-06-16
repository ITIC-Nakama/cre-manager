import { apiClient } from '../AxiosApiClient';
import type { DashboardOverview, StudentRow } from '../../types/models/Dashboard';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export interface StudentPage {
    content: StudentRow[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export interface StudentListParams {
    page?: number;
    size?: number;
    search?: string;
    isActive?: boolean;
    hasCv?: boolean;
    hasStale?: boolean;
    promotionId?: string;
}

export function fetchDashboardOverview(): Promise<DashboardOverview> {
    return apiClient.get('/dashboard/overview').then(unwrap<DashboardOverview>);
}

export function fetchStudentList(params: StudentListParams = {}): Promise<StudentPage> {
    const query: Record<string, unknown> = { page: params.page ?? 0, size: params.size ?? 20 };
    if (params.search)      query.search     = params.search;
    if (params.isActive     !== undefined) query.isActive   = params.isActive;
    if (params.hasCv        !== undefined) query.hasCv      = params.hasCv;
    if (params.hasStale     !== undefined) query.hasStale   = params.hasStale;
    if (params.promotionId)               query.promotionId = params.promotionId;

    return apiClient.get('/dashboard/students', { params: query }).then(unwrap<StudentPage>);
}

export function fetchAllStudents(): Promise<StudentRow[]> {
    return fetchStudentList({ size: 10000, page: 0 }).then((p) => p.content);
}

export function notifyStudent(studentId: string, message?: string): Promise<void> {
    return apiClient
        .post(`/dashboard/students/${studentId}/notify`, message ? { message } : {})
        .then(() => undefined);
}

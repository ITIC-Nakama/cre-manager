import { apiClient } from '../AxiosApiClient';
import type { DashboardOverview, StudentRow, StudentPage, StudentListParams } from '../../types/models/Dashboard';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
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
    if (params.includeAnonymized !== undefined) query.includeAnonymized = params.includeAnonymized;

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

export function deactivateStudent(studentId: string): Promise<void> {
    return apiClient.delete(`/auth/users/${studentId}`).then(() => undefined);
}

export function reactivateStudent(studentId: string): Promise<void> {
    return apiClient.patch(`/auth/users/${studentId}/reactivate`).then(() => undefined);
}

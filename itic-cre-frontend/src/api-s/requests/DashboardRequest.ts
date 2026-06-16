import { apiClient } from '../AxiosApiClient';
import type { DashboardOverview, StudentRow } from '../../types/models/Dashboard';

function unwrap<T>(response: { data: { data?: T } | T }): T {
    const d = response.data as any;
    return d?.data ?? d;
}

export function fetchDashboardOverview(): Promise<DashboardOverview> {
    return apiClient.get('/dashboard/overview').then(unwrap<DashboardOverview>);
}

export function fetchStudentList(promotionId?: string): Promise<StudentRow[]> {
    const params = promotionId ? { promotionId } : undefined;
    return apiClient.get('/dashboard/students', { params }).then((res) => {
        const data = unwrap<StudentRow[] | { content: StudentRow[] }>(res);
        return Array.isArray(data) ? data : (data as any)?.content ?? [];
    });
}

export function notifyStudent(studentId: string, message?: string): Promise<void> {
    return apiClient.post(`/dashboard/students/${studentId}/notify`, message ? { message } : {}).then(() => undefined);
}

import { apiClient } from '../AxiosApiClient';
import type { StudentDashboardSummary } from '../../types/models/Dashboard';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export function fetchMyDashboardSummary(): Promise<StudentDashboardSummary> {
    return apiClient.get('/api/me/dashboard/summary').then((response) => unwrap<StudentDashboardSummary>(response));
}

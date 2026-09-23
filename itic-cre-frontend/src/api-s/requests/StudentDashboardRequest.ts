import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';
import type { StudentDashboardSummary } from '../../types/models/Dashboard';

export function fetchMyDashboardSummary(): Promise<StudentDashboardSummary> {
    return apiClient.get('/api/me/dashboard/summary').then((response) => unwrap<StudentDashboardSummary>(response));
}

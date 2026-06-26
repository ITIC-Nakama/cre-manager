import { useQuery } from '@tanstack/react-query';
import { fetchMyDashboardSummary } from '../api-s/requests/StudentDashboardRequest';

export function useMyDashboardSummary(enabled = true) {
    return useQuery({
        queryKey: ['student-dashboard', 'summary'],
        queryFn: fetchMyDashboardSummary,
        enabled,
    });
}

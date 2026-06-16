import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../api-s/requests/AuditRequest';

export function useAuditLogs(page = 0) {
    return useQuery({
        queryKey: ['audit-logs', page],
        queryFn: () => fetchAuditLogs(page),
    });
}

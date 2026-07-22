import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../api-s/requests/AuditRequest';
import type { AuditLogParams } from '../api-s/requests/AuditRequest';

export function useAuditLogs(params: AuditLogParams = {}) {
    return useQuery({
        queryKey: ['audit-logs', params],
        queryFn: () => fetchAuditLogs(params),
        placeholderData: (prev) => prev,
    });
}

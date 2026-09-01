import { useQuery } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
import { fetchAuditLogs } from '../api-s/requests/AuditRequest';
import type { AuditLogParams } from '../types/models/Audit';

export function useAuditLogs(params: AuditLogParams = {}) {
    return useQuery({
        queryKey: ['audit-logs', params],
        queryFn: () => fetchAuditLogs(params),
        placeholderData: (prev) => prev,
    });
}

export function useAuditLogsInfinite(params: AuditLogParams = {}) {
    return useInfiniteListQuery(['audit-logs', 'infinite', params], fetchAuditLogs, params);
}

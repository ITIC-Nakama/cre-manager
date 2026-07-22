import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchAuditLogs } from '../api-s/requests/AuditRequest';
import type { AuditLogParams } from '../api-s/requests/AuditRequest';

export function useAuditLogs(params: AuditLogParams = {}) {
    const { i18n } = useTranslation();

    return useQuery({
        queryKey: ['audit-logs', params, i18n.language],
        queryFn: () => fetchAuditLogs(params),
        placeholderData: (prev) => prev,
    });
}

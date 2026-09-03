import { apiClient } from '../AxiosApiClient';
import type { AuditLog, AuditPage, AuditLogParams } from '../../types/models/Audit';

export type { AuditLog, AuditPage, AuditLogParams };

export function fetchAuditLogs(params: AuditLogParams = {}): Promise<AuditPage> {
    const { page = 0, size = 20, search, action, from, to, sort = 'createdAt,desc' } = params;
    return apiClient
        .get('/auth/admin/audit-logs', { params: { page, size, search, action, from, to, sort } })
        .then((res) => {
            const data = (res.data as any)?.data ?? res.data;
            return data as AuditPage;
        });
}

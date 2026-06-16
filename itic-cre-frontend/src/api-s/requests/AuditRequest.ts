import { apiClient } from '../AxiosApiClient';

export interface AuditLog {
    id: string;
    actorId: string | null;
    actorEmail: string | null;
    actorRole: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    description: string | null;
    ipAddress: string | null;
    createdAt: string;
}

export interface AuditPage {
    content: AuditLog[];
    totalElements: number;
    totalPages: number;
    number: number;
}

export function fetchAuditLogs(page = 0, size = 20): Promise<AuditPage> {
    return apiClient
        .get('/auth/admin/audit-logs', { params: { page, size, sort: 'createdAt,desc' } })
        .then((res) => {
            const data = (res.data as any)?.data ?? res.data;
            return data as AuditPage;
        });
}

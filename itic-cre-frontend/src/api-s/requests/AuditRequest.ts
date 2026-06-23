import { apiClient } from '../AxiosApiClient';

export interface AuditLog {
    id: string;
    actorId: string | null;
    actorEmail: string | null;
    actorFirstName: string | null;
    actorLastName: string | null;
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

export interface AuditLogParams {
    page?: number;
    size?: number;
    search?: string;
    action?: string;
    from?: string;
    to?: string;
}

export function fetchAuditLogs(params: AuditLogParams = {}): Promise<AuditPage> {
    const { page = 0, size = 20, search, action, from, to } = params;
    return apiClient
        .get('/auth/admin/audit-logs', { params: { page, size, search, action, from, to, sort: 'createdAt,desc' } })
        .then((res) => {
            const data = (res.data as any)?.data ?? res.data;
            return data as AuditPage;
        });
}

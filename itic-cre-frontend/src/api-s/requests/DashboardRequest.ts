import { apiClient } from '../AxiosApiClient';
import type {
    DashboardOverview,
    PromotionYearCounts,
    StudentRow,
    StudentPage,
    StudentListParams,
} from '../../types/models/Dashboard';

function unwrap<T>(response: { data: unknown }): T {
    const d = response.data as Record<string, unknown>;
    return (d?.data ?? d) as T;
}

export function fetchDashboardOverview(advisorId?: string): Promise<DashboardOverview> {
    return apiClient.get('/dashboard/overview', { params: { advisorId } }).then(unwrap<DashboardOverview>);
}

export function fetchPromotionStudentCounts(): Promise<Record<string, number>> {
    return apiClient.get('/dashboard/promotions/student-counts').then(unwrap<Record<string, number>>);
}

export function fetchPromotionYearCounts(promotionId: string): Promise<PromotionYearCounts> {
    return apiClient.get(`/dashboard/promotions/${promotionId}/year-counts`).then(unwrap<PromotionYearCounts>);
}

export function fetchStudentList(params: StudentListParams = {}): Promise<StudentPage> {
    const query: Record<string, unknown> = { page: params.page ?? 0, size: params.size ?? 20 };
    if (params.search)      query.search     = params.search;
    if (params.isActive     !== undefined) query.isActive   = params.isActive;
    if (params.hasCv        !== undefined) query.hasCv      = params.hasCv;
    if (params.hasStale     !== undefined) query.hasStale   = params.hasStale;
    if (params.promotionId)               query.promotionId = params.promotionId;
    if (params.studyYear    !== undefined) query.studyYear  = params.studyYear;
    if (params.studyYearMissing !== undefined) query.studyYearMissing = params.studyYearMissing;
    if (params.excludePromotionId)        query.excludePromotionId = params.excludePromotionId;
    if (params.advisorId)                 query.advisorId = params.advisorId;
    if (params.includeAnonymized !== undefined) query.includeAnonymized = params.includeAnonymized;
    if (params.underContract !== undefined) query.underContract = params.underContract;
    if (params.needsContractVerification !== undefined) query.needsContractVerification = params.needsContractVerification;
    if (params.sort)                      query.sort = params.sort;

    return apiClient.get('/dashboard/students', { params: query }).then(unwrap<StudentPage>);
}

/** Top 5 des étudiants nécessitant une action (candidature stagnante ou CV manquant), triés et scopés côté backend. */
export function fetchStudentsNeedingAttention(advisorId?: string): Promise<StudentRow[]> {
    return apiClient.get('/dashboard/students/needing-attention', { params: { advisorId } }).then(unwrap<StudentRow[]>);
}

export function fetchAllStudents(params: Omit<StudentListParams, 'page' | 'size'> = {}): Promise<StudentRow[]> {
    const query: Record<string, unknown> = {};
    if (params.search)      query.search     = params.search;
    if (params.isActive     !== undefined) query.isActive   = params.isActive;
    if (params.hasCv        !== undefined) query.hasCv      = params.hasCv;
    if (params.hasStale     !== undefined) query.hasStale   = params.hasStale;
    if (params.promotionId)               query.promotionId = params.promotionId;
    if (params.studyYear    !== undefined) query.studyYear  = params.studyYear;
    if (params.studyYearMissing !== undefined) query.studyYearMissing = params.studyYearMissing;
    if (params.excludePromotionId)        query.excludePromotionId = params.excludePromotionId;
    if (params.advisorId)                 query.advisorId = params.advisorId;
    if (params.includeAnonymized !== undefined) query.includeAnonymized = params.includeAnonymized;
    if (params.underContract !== undefined) query.underContract = params.underContract;
    if (params.needsContractVerification !== undefined) query.needsContractVerification = params.needsContractVerification;

    return apiClient.get('/dashboard/students/all', { params: query }).then(unwrap<StudentRow[]>);
}

export function exportApplicationsCsv(params: Record<string, unknown> = {}): Promise<Blob> {
    const query: Record<string, unknown> = {};
    if (params.search)             query.search             = params.search;
    if (params.statusId)           query.statusId           = params.statusId;
    if (params.promotionId)        query.promotionId        = params.promotionId;
    if (params.typeContratId)      query.typeContratId      = params.typeContratId;
    if (params.stale !== undefined) query.stale             = params.stale;
    if (params.activeStudentsOnly !== undefined) query.activeStudentsOnly = params.activeStudentsOnly;
    if (params.advisorId)          query.advisorId          = params.advisorId;

    return apiClient.get('/dashboard/applications/export', {
        params: query,
        responseType: 'blob',
    }).then((res) => res.data as Blob);
}

export function notifyStudent(studentId: string, message?: string): Promise<void> {
    return apiClient
        .post(`/dashboard/students/${studentId}/notify`, message ? { message } : {})
        .then(() => undefined);
}

export function deactivateStudent(studentId: string): Promise<void> {
    return apiClient.patch(`/auth/users/${studentId}/deactivate`).then(() => undefined);
}

export function reactivateStudent(studentId: string): Promise<void> {
    return apiClient.patch(`/auth/users/${studentId}/reactivate`).then(() => undefined);
}

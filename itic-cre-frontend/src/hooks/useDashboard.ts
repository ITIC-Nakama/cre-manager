import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchDashboardOverview,
    fetchPromotionStudentCounts,
    fetchPromotionYearCounts,
    fetchStudentList,
    notifyStudent,
    deactivateStudent,
    reactivateStudent,
} from '../api-s/requests/DashboardRequest';
import type { StudentListParams } from '../types/models/Dashboard';

export function useDashboardOverview() {
    return useQuery({
        queryKey: ['dashboard', 'overview'],
        queryFn: fetchDashboardOverview,
    });
}

export function usePromotionStudentCounts() {
    return useQuery({
        queryKey: ['dashboard', 'promotions', 'student-counts'],
        queryFn: fetchPromotionStudentCounts,
    });
}

export function usePromotionYearCounts(promotionId?: string, enabled = true) {
    return useQuery({
        queryKey: ['dashboard', 'promotions', promotionId, 'year-counts'],
        queryFn: () => fetchPromotionYearCounts(promotionId!),
        enabled: enabled && !!promotionId,
    });
}

export function useStudentList(params: StudentListParams = {}, enabled = true) {
    return useQuery({
        queryKey: ['dashboard', 'students', params],
        queryFn: () => fetchStudentList(params),
        placeholderData: (prev) => prev,
        enabled,
    });
}

export function useNotifyStudent() {
    return useMutation({
        mutationFn: ({ studentId, message }: { studentId: string; message?: string }) =>
            notifyStudent(studentId, message),
    });
}

export function useDeactivateStudent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (studentId: string) => deactivateStudent(studentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'students'] });
        },
    });
}

export function useReactivateStudent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (studentId: string) => reactivateStudent(studentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'students'] });
        },
    });
}

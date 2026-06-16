import { useQuery, useMutation } from '@tanstack/react-query';
import {
    fetchDashboardOverview,
    fetchStudentList,
    fetchAllStudents,
    notifyStudent,
} from '../api-s/requests/DashboardRequest';
import type { StudentListParams } from '../api-s/requests/DashboardRequest';

export function useDashboardOverview() {
    return useQuery({
        queryKey: ['dashboard', 'overview'],
        queryFn: fetchDashboardOverview,
    });
}

export function useStudentList(params: StudentListParams = {}) {
    return useQuery({
        queryKey: ['dashboard', 'students', params],
        queryFn: () => fetchStudentList(params),
        placeholderData: (prev) => prev,
    });
}

export function useAllStudents(enabled = false) {
    return useQuery({
        queryKey: ['dashboard', 'students', 'all'],
        queryFn: fetchAllStudents,
        enabled,
    });
}

export function useNotifyStudent() {
    return useMutation({
        mutationFn: ({ studentId, message }: { studentId: string; message?: string }) =>
            notifyStudent(studentId, message),
    });
}

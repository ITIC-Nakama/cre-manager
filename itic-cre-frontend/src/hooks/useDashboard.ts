import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchDashboardOverview, fetchStudentList, notifyStudent } from '../api-s/requests/DashboardRequest';

export function useDashboardOverview() {
    return useQuery({
        queryKey: ['dashboard', 'overview'],
        queryFn: fetchDashboardOverview,
    });
}

export function useStudentList(promotionId?: string) {
    return useQuery({
        queryKey: ['dashboard', 'students', promotionId],
        queryFn: () => fetchStudentList(promotionId),
    });
}

export function useNotifyStudent() {
    return useMutation({
        mutationFn: ({ studentId, message }: { studentId: string; message?: string }) =>
            notifyStudent(studentId, message),
    });
}

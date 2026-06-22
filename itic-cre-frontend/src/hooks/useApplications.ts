import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApplicationList, fetchApplicationStatuses, fetchContractTypes, updateApplicationStatus } from '../api-s/requests/ApplicationRequest';
import type { ApplicationListParams } from '../api-s/requests/ApplicationRequest';

export function useApplicationList(params: ApplicationListParams = {}) {
    return useQuery({
        queryKey: ['applications', params],
        queryFn: () => fetchApplicationList(params),
        placeholderData: (prev) => prev,
    });
}

export function useApplicationStatuses() {
    return useQuery({
        queryKey: ['application-statuses'],
        queryFn: fetchApplicationStatuses,
        staleTime: 5 * 60 * 1000,
    });
}

export function useContractTypes() {
    return useQuery({
        queryKey: ['contract-types'],
        queryFn: fetchContractTypes,
        staleTime: 5 * 60 * 1000,
    });
}

export function useUpdateApplicationStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { gainXP?: number; couleur?: string } }) =>
            updateApplicationStatus(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['application-statuses'] });
        },
    });
}

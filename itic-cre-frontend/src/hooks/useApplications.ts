import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
import { fetchApplicationList, fetchApplicationGroupedList, fetchApplicationStatuses, fetchContractTypes, updateApplicationStatus, updateApplicationContractDates, verifyApplicationContract, rejectApplicationContract } from '../api-s/requests/ApplicationRequest';
import type { ApplicationListParams } from '../types/models/Application';

export function useApplicationList(params: ApplicationListParams = {}) {
    return useQuery({
        queryKey: ['applications', params],
        queryFn: () => fetchApplicationList(params),
        placeholderData: (prev) => prev,
    });
}

export function useApplicationGroupedList(params: ApplicationListParams = {}) {
    return useQuery({
        queryKey: ['applications-grouped', params],
        queryFn: () => fetchApplicationGroupedList(params),
        placeholderData: (prev) => prev,
    });
}

export function useApplicationGroupedListInfinite(params: ApplicationListParams = {}) {
    return useInfiniteListQuery(['applications-grouped', 'infinite', params], fetchApplicationGroupedList, params);
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

export function useUpdateContractDates() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, startDate, endDate }: { id: string; startDate?: string | null; endDate?: string | null }) =>
            updateApplicationContractDates(id, { startDate, endDate }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications-grouped'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

export function useVerifyContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => verifyApplicationContract(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications-grouped'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

export function useRejectContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => rejectApplicationContract(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications-grouped'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

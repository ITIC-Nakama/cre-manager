import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
import { fetchApplicationGroupedList, fetchApplicationStatuses, fetchContractTypes, updateApplicationStatus, updateApplicationContractDates, validateApplicationContract, invalidateApplicationContract, createApplicationForStudent, updateApplicationAsAdvisor, deleteApplicationAsAdvisor, changeApplicationStatusAsAdvisor } from '../api-s/requests/ApplicationRequest';
import type { ApplicationListParams, CandidaturePayload } from '../types/models/Application';

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

export function useValidateContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => validateApplicationContract(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications-grouped'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

export function useInvalidateContract() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => invalidateApplicationContract(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications-grouped'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

export function useCreateApplicationForStudent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ studentId, payload }: { studentId: string; payload: CandidaturePayload }) =>
            createApplicationForStudent(studentId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications-grouped'] });
        },
    });
}

export function useUpdateApplicationAsAdvisor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: CandidaturePayload }) =>
            updateApplicationAsAdvisor(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications-grouped'] });
        },
    });
}

export function useDeleteApplicationAsAdvisor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteApplicationAsAdvisor(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications-grouped'] });
        },
    });
}

export function useChangeApplicationStatusAsAdvisor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, statusId, startDate, endDate, contractTypeId }: { id: string; statusId: string; startDate?: string; endDate?: string; contractTypeId?: string }) =>
            changeApplicationStatusAsAdvisor(id, statusId, startDate, endDate, contractTypeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications-grouped'] });
        },
    });
}

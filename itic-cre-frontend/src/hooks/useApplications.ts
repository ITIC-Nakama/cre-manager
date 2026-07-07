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

import {
    fetchMyApplications,
    createApplication,
    updateApplication,
    changeApplicationStatus,
    deleteApplication,
    type ApplicationFormData
} from '../api-s/requests/ApplicationRequest';

export function useMyApplications(params: ApplicationListParams = {}) {
    return useQuery({
        queryKey: ['my-applications', params],
        queryFn: () => fetchMyApplications(params),
        placeholderData: (prev) => prev,
    });
}

export function useCreateApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createApplication,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-applications'] });
        },
    });
}

export function useUpdateApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: ApplicationFormData }) =>
            updateApplication(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-applications'] });
        },
    });
}

export function useChangeApplicationStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
            changeApplicationStatus(id, statusId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-applications'] });
            // L'XP peut changer, donc on invalide aussi le résumé dashboard
            queryClient.invalidateQueries({ queryKey: ['my-dashboard-summary'] });
        },
    });
}

export function useDeleteApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteApplication,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-applications'] });
            queryClient.invalidateQueries({ queryKey: ['my-dashboard-summary'] });
        },
    });
}

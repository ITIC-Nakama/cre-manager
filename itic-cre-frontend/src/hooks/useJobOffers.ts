import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchAllJobOffers,
    fetchActiveJobOffers,
    fetchSectors,
    createSector,
    createJobOffer,
    updateJobOffer,
    deactivateJobOffer,
    activateJobOffer,
    deleteJobOffer,
    applyToJobOffer,
    fetchMyJobApplications,
    withdrawJobApplication,
    fetchExternalJobboardStats,
    triggerExternalJobboardSync,
    toggleExternalJobboardSource,
} from '../api-s/requests/JobOfferRequest';
import type { JobOfferListParams, JobOfferPayload } from '../types/models/JobOffer';

export function useAllJobOffers(params: JobOfferListParams = {}) {
    return useQuery({
        queryKey: ['job-offers', 'all', params],
        queryFn: () => fetchAllJobOffers(params),
        placeholderData: (prev) => prev,
    });
}

export function useActiveJobOffers(params: JobOfferListParams = {}) {
    return useQuery({
        queryKey: ['job-offers', 'active', params],
        queryFn: () => fetchActiveJobOffers(params),
        placeholderData: (prev) => prev,
    });
}

export function useSectors() {
    return useQuery({
        queryKey: ['sectors'],
        queryFn: fetchSectors,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateSector() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (label: string) => createSector(label),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sectors'] }),
    });
}

export function useMyJobApplications() {
    return useQuery({
        queryKey: ['job-applications', 'mine'],
        queryFn: fetchMyJobApplications,
    });
}

export function useCreateJobOffer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: JobOfferPayload) => createJobOffer(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-offers'] }),
    });
}

export function useUpdateJobOffer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: JobOfferPayload }) => updateJobOffer(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-offers'] }),
    });
}

export function useDeactivateJobOffer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deactivateJobOffer(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-offers'] }),
    });
}

export function useActivateJobOffer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => activateJobOffer(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-offers'] }),
    });
}

export function useDeleteJobOffer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteJobOffer(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-offers'] }),
    });
}

export function useApplyToJobOffer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (jobOfferId: string) => applyToJobOffer(jobOfferId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-applications'] });
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['my-candidatures'] });
        },
    });
}

export function useWithdrawJobApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => withdrawJobApplication(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-applications'] });
            queryClient.invalidateQueries({ queryKey: ['my-candidatures'] });
        },
    });
}

// Admin — jobboard externe
export function useExternalJobboardStats() {
    return useQuery({
        queryKey: ['jobboard-external-stats'],
        queryFn: fetchExternalJobboardStats,
        refetchInterval: (query) => (query.state.data?.syncInProgress ? 5000 : 30000),
    });
}

export function useTriggerExternalJobboardSync() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => triggerExternalJobboardSync(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobboard-external-stats'] });
            queryClient.invalidateQueries({ queryKey: ['job-offers'] });
        },
    });
}

export function useToggleExternalJobboardSource() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (source: string) => toggleExternalJobboardSource(source),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobboard-external-stats'] }),
    });
}

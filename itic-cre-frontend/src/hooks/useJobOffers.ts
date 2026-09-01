import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
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
    wipeJobOffers,
    applyToJobOffer,
    fetchMyJobApplications,
    withdrawJobApplication,
    fetchExternalJobboardStats,
    triggerExternalJobboardSync,
    toggleExternalJobboardSource,
    toggleScheduledSync,
    updateExternalSourceCriteria,
    fetchRomeCodesReference,
    fetchRegionsReference,
    fetchAdzunaCategoriesReference,
} from '../api-s/requests/JobOfferRequest';
import type { JobOfferListParams, JobOfferPayload, ExternalSourceCriteriaPayload } from '../types/models/JobOffer';

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

export function useAllJobOffersInfinite(params: JobOfferListParams = {}) {
    return useInfiniteListQuery(['job-offers', 'all', 'infinite', params], fetchAllJobOffers, params);
}

export function useActiveJobOffersInfinite(params: JobOfferListParams = {}) {
    return useInfiniteListQuery(['job-offers', 'active', 'infinite', params], fetchActiveJobOffers, params);
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

export function useWipeJobOffers() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (scope: 'MANUAL' | 'EXTERNAL' | 'ALL') => wipeJobOffers(scope),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-offers'] });
            queryClient.invalidateQueries({ queryKey: ['jobboard-external-stats'] });
        },
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

export function useToggleScheduledSync() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => toggleScheduledSync(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobboard-external-stats'] }),
    });
}

export function useUpdateExternalSourceCriteria() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ source, criteria }: { source: string; criteria: ExternalSourceCriteriaPayload }) =>
            updateExternalSourceCriteria(source, criteria),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobboard-external-stats'] }),
    });
}

// Référentiels quasi statiques (codes ROME, catégories Adzuna) : staleTime long, pas de refetch
// agressif — ces listes ne changent pratiquement jamais.
export function useRomeCodesReference() {
    return useQuery({
        queryKey: ['jobboard-external-reference', 'rome-codes'],
        queryFn: fetchRomeCodesReference,
        staleTime: 60 * 60 * 1000,
    });
}

export function useRegionsReference() {
    return useQuery({
        queryKey: ['jobboard-external-reference', 'regions'],
        queryFn: fetchRegionsReference,
        staleTime: 60 * 60 * 1000,
    });
}

export function useAdzunaCategoriesReference() {
    return useQuery({
        queryKey: ['jobboard-external-reference', 'adzuna-categories'],
        queryFn: fetchAdzunaCategoriesReference,
        staleTime: 60 * 60 * 1000,
    });
}

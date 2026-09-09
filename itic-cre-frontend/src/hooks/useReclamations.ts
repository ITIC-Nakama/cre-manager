import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
import {
    createReclamation, deleteReclamation, fetchMyReclamations,
    fetchAdvisorReclamations, fetchPendingReclamationsCount, resolveReclamation, refuseReclamation, reopenReclamation,
} from '../api-s/requests/ReclamationRequest';
import type { CreateReclamationPayload, FetchReclamationsParams, FetchAdvisorReclamationsParams } from '../types/models/Reclamation';

const MY_RECLAMATIONS_KEY = ['my-reclamations'] as const;
const ADVISOR_RECLAMATIONS_KEY = ['advisor-reclamations'] as const;
const PENDING_RECLAMATIONS_COUNT_KEY = ['advisor-reclamations', 'pending-count'] as const;

export function useMyReclamationsInfinite(params: FetchReclamationsParams = {}) {
    return useInfiniteListQuery([...MY_RECLAMATIONS_KEY, 'infinite', params], fetchMyReclamations, params);
}

export function useCreateReclamation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateReclamationPayload) => createReclamation(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MY_RECLAMATIONS_KEY });
        },
    });
}

export function useDeleteReclamation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteReclamation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MY_RECLAMATIONS_KEY });
        },
    });
}

// ─── Conseiller / admin ─────────────────────────────────────────────────────

export function useAdvisorReclamationsInfinite(params: FetchAdvisorReclamationsParams = {}) {
    return useInfiniteListQuery([...ADVISOR_RECLAMATIONS_KEY, 'infinite', params], fetchAdvisorReclamations, params);
}

// Rafraichi toutes les 30s (comme useExternalJobboardStats) pour que le badge sidebar reste a
// jour meme si l'etudiant a soumis la reclamation dans une autre session que celle du conseiller.
export function usePendingReclamationsCount() {
    return useQuery({
        queryKey: PENDING_RECLAMATIONS_COUNT_KEY,
        queryFn: fetchPendingReclamationsCount,
        refetchInterval: 30000,
    });
}

function useUpdateReclamationStatus(mutationFn: (id: string) => Promise<unknown>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADVISOR_RECLAMATIONS_KEY });
            queryClient.invalidateQueries({ queryKey: PENDING_RECLAMATIONS_COUNT_KEY });
        },
    });
}

export function useResolveReclamation() {
    return useUpdateReclamationStatus(resolveReclamation);
}

export function useRefuseReclamation() {
    return useUpdateReclamationStatus(refuseReclamation);
}

export function useReopenReclamation() {
    return useUpdateReclamationStatus(reopenReclamation);
}

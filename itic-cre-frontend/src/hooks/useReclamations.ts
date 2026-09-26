import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
import {
    createReclamation, deleteReclamation, fetchMyReclamations, fetchReclamationFormContext,
    fetchAdvisorReclamations, fetchPendingReclamationsCount, fetchMyPendingReclamationsCount,
    fetchOutsideMyPortfolioPendingCount, resolveReclamation, refuseReclamation, reopenReclamation,
} from '../api-s/requests/ReclamationRequest';
import type { CreateReclamationPayload, FetchReclamationsParams, FetchAdvisorReclamationsParams } from '../types/models/Reclamation';

const MY_RECLAMATIONS_KEY = ['my-reclamations'] as const;
const RECLAMATION_FORM_CONTEXT_KEY = ['reclamation-form-context'] as const;
const ADVISOR_RECLAMATIONS_KEY = ['advisor-reclamations'] as const;
const PENDING_RECLAMATIONS_COUNT_KEY = ['advisor-reclamations', 'pending-count'] as const;

export function useMyReclamationsInfinite(params: FetchReclamationsParams = {}) {
    return useInfiniteListQuery([...MY_RECLAMATIONS_KEY, 'infinite', params], fetchMyReclamations, params);
}

export function useReclamationFormContext() {
    return useQuery({
        queryKey: RECLAMATION_FORM_CONTEXT_KEY,
        queryFn: fetchReclamationFormContext,
        staleTime: 0,
    });
}

export function useCreateReclamation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateReclamationPayload) => createReclamation(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MY_RECLAMATIONS_KEY });
            queryClient.invalidateQueries({ queryKey: RECLAMATION_FORM_CONTEXT_KEY });
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

// Poll toutes les minutes + refetch au focus de l'onglet (defaut React Query).
// Badge sidebar — jamais affecte par la case "Mon portefeuille uniquement" de la page Messages.
export function usePendingReclamationsCount() {
    return useQuery({
        queryKey: PENDING_RECLAMATIONS_COUNT_KEY,
        queryFn: fetchPendingReclamationsCount,
        refetchInterval: 60000,
    });
}

/** Toujours mon seul portefeuille, meme pour un admin — affiche a cote de la case a cocher, independamment de son etat. */
export function useMyPendingReclamationsCount() {
    return useQuery({
        queryKey: [...ADVISOR_RECLAMATIONS_KEY, 'pending-count-mine'],
        queryFn: fetchMyPendingReclamationsCount,
        refetchInterval: 60000,
    });
}

/** Complementaire de useMyPendingReclamationsCount. */
export function useOutsideMyPortfolioPendingCount() {
    return useQuery({
        queryKey: [...ADVISOR_RECLAMATIONS_KEY, 'pending-count-outside-mine'],
        queryFn: fetchOutsideMyPortfolioPendingCount,
        refetchInterval: 60000,
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

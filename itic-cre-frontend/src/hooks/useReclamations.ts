import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
import { createReclamation, deleteReclamation, fetchMyReclamations } from '../api-s/requests/ReclamationRequest';
import type { CreateReclamationPayload, FetchReclamationsParams } from '../types/models/Reclamation';

const MY_RECLAMATIONS_KEY = ['my-reclamations'] as const;

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

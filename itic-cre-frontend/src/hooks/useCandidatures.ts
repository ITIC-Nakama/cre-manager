import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchMyCandidatures,
    fetchCandidatureById,
    createCandidature,
    updateCandidature,
    changeCandidatureStatus,
    deleteCandidature,
} from '../api-s/requests/CandidatureRequest';
import type { CandidaturePayload } from '../types/models/Application';

const MY_CANDIDATURES_KEY = ['my-candidatures'] as const;

export function useMyCandidatures() {
    return useQuery({
        queryKey: MY_CANDIDATURES_KEY,
        queryFn: fetchMyCandidatures,
    });
}

export function useCandidature(id: string | undefined) {
    return useQuery({
        queryKey: [...MY_CANDIDATURES_KEY, 'detail', id],
        queryFn: () => fetchCandidatureById(id as string),
        enabled: !!id,
    });
}

export function useCreateCandidature() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CandidaturePayload) => createCandidature(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_CANDIDATURES_KEY }),
    });
}

export function useUpdateCandidature() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: CandidaturePayload }) => updateCandidature(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_CANDIDATURES_KEY }),
    });
}

export function useChangeCandidatureStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, statusId }: { id: string; statusId: string }) => changeCandidatureStatus(id, statusId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MY_CANDIDATURES_KEY });
            queryClient.invalidateQueries({ queryKey: ['me'] });
            queryClient.invalidateQueries({ queryKey: ['gamification'] });
        },
    });
}

export function useDeleteCandidature() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteCandidature(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_CANDIDATURES_KEY }),
    });
}

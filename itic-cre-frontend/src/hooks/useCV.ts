import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchAllCVs,
    fetchCVStatuts,
    updateCVStatus,
    updateCVStatutConfig,
    addCVComment,
    fetchCVComments,
    deleteCVComment,
    fetchCVStats,
} from '../api-s/requests/CVRequest';
import type { CVListParams } from '../api-s/requests/CVRequest';
import type { CVStatut } from '../types/models/CV';

export function useAllCVs(params: CVListParams = {}) {
    return useQuery({
        queryKey: ['cvs', 'all', params],
        queryFn: () => fetchAllCVs(params),
        placeholderData: (prev) => prev,
    });
}

export function useCVStatuts() {
    return useQuery({
        queryKey: ['cv-statuts'],
        queryFn: fetchCVStatuts,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useCVComments(cvId: string | null) {
    return useQuery({
        queryKey: ['cv-comments', cvId],
        queryFn: () => fetchCVComments(cvId!),
        enabled: !!cvId,
    });
}

export function useUpdateCVStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cvId, statutId }: { cvId: string; statutId: string }) =>
            updateCVStatus(cvId, statutId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cvs'] });
            queryClient.invalidateQueries({ queryKey: ['cv-stats'] });
        },
    });
}

export function useAddCVComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cvId, contenu }: { cvId: string; contenu: string }) =>
            addCVComment(cvId, contenu),
        onSuccess: (_data, variables) =>
            queryClient.invalidateQueries({ queryKey: ['cv-comments', variables.cvId] }),
    });
}

export function useDeleteCVComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (variables: { cvId: string; commentId: string }) =>
            deleteCVComment(variables.commentId),
        onSuccess: (_data, variables) =>
            queryClient.invalidateQueries({ queryKey: ['cv-comments', variables.cvId] }),
    });
}

export function useUpdateCVStatutConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Omit<CVStatut, 'id'> }) =>
            updateCVStatutConfig(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cv-statuts'] });
        },
    });
}

export function useCVStats() {
    return useQuery({
        queryKey: ['cv-stats'],
        queryFn: fetchCVStats,
    });
}

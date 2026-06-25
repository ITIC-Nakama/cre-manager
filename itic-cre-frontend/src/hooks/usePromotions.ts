import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    removeStudentFromPromotion,
    assignStudentToPromotion,
} from '../api-s/requests/PromotionRequest';
import type { PromotionData } from '../api-s/requests/PromotionRequest';

export function usePromotions() {
    return useQuery({
        queryKey: ['promotions'],
        queryFn: fetchPromotions,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreatePromotion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: PromotionData) => createPromotion(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
        },
    });
}

export function useUpdatePromotion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: PromotionData }) => updatePromotion(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
        },
    });
}

export function useDeletePromotion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deletePromotion(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
        },
    });
}

export function useRemoveStudentFromPromotion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ promotionId, studentId }: { promotionId: string; studentId: string }) =>
            removeStudentFromPromotion(promotionId, studentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'students'] });
        },
    });
}

export function useAssignStudentToPromotion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ promotionId, studentId }: { promotionId: string; studentId: string }) =>
            assignStudentToPromotion(promotionId, studentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'students'] });
        },
    });
}

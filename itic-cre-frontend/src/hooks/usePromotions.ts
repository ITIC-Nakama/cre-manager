import { useQuery } from '@tanstack/react-query';
import { fetchPromotions } from '../api-s/requests/PromotionRequest';

export function usePromotions() {
    return useQuery({
        queryKey: ['promotions'],
        queryFn: fetchPromotions,
        staleTime: 5 * 60 * 1000,
    });
}

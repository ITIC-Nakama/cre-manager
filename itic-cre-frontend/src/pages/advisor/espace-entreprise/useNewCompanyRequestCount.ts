import { useQuery } from '@tanstack/react-query';
import { fetchNewCompanyRequestCount } from '../../../api-s/requests/CompanySpaceRequest';

export const NEW_REQUESTS_KEY = ['company-space', 'requests', 'new-count'] as const;

/** Badge du menu : demandes d'entreprises nouvelles (une requête par minute). */
export function useNewCompanyRequestCount() {
    return useQuery({ queryKey: NEW_REQUESTS_KEY, queryFn: fetchNewCompanyRequestCount, refetchInterval: 60_000, staleTime: 30_000 });
}

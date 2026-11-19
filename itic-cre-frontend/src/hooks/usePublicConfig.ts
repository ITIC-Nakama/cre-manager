import { useQuery } from '@tanstack/react-query';
import { fetchPublicConfig } from '../api-s/requests/PublicConfigRequest';

export const PUBLIC_CONFIG_KEY = ['public-config'] as const;

/** Configuration publique (une fois par session). Tant qu'elle n'est pas chargée, l'Espace entreprise compte pour masqué. */
export function usePublicConfig() {
    const query = useQuery({ queryKey: PUBLIC_CONFIG_KEY, queryFn: fetchPublicConfig, staleTime: Infinity, retry: 1 });
    return { ...query, companySpaceEnabled: query.data?.companySpaceEnabled === true };
}

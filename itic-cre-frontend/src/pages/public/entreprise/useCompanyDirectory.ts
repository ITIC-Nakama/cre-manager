import { useQuery } from '@tanstack/react-query';
import { fetchCompanyDirectory } from '../../../api-s/requests/CompanySpaceRequest';

export const COMPANY_DIRECTORY_KEY = ['company-space', 'directory'] as const;

/** L'annuaire (textes compris) : une requête partagée par l'accueil, le répertoire et le pied de page. */
export function useCompanyDirectory() {
    return useQuery({ queryKey: COMPANY_DIRECTORY_KEY, queryFn: fetchCompanyDirectory, staleTime: 60_000, retry: false });
}

import { useQuery } from '@tanstack/react-query';
import { fetchAdminPrograms } from '../api-s/requests/CompanySpaceRequest';

/** Formations de l'annuaire (Espace entreprise), pour les filtres et le formulaire d'offre (équipe). */
export function usePrograms(enabled = true) {
    return useQuery({ queryKey: ['company-space', 'programs'], queryFn: fetchAdminPrograms, staleTime: 5 * 60_000, enabled });
}

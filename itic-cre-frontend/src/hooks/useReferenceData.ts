import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchAllReferenceData,
    createReferenceData,
    updateReferenceData,
    deleteReferenceData,
    deactivateReferenceData,
    type ReferenceDataPayload,
} from '../api-s/requests/ReferenceDataRequest';

export interface LabeledReferenceItem {
    id: string;
    label: string;
    description: string | null;
    active: boolean;
    createdAt: string;
}

/**
 * CRUD partage pour les tables de reference "label unique + actif/inactif"
 * (secteurs, types de contrat...) — miroir cote frontend de
 * AbstractLabeledReferenceDataService cote backend.
 */
export function useReferenceDataManager<T extends LabeledReferenceItem>(basePath: string, queryKey: string) {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

    const list = useQuery({
        queryKey: [queryKey, 'all'],
        queryFn: () => fetchAllReferenceData<T>(basePath),
    });

    const create = useMutation({
        mutationFn: (payload: ReferenceDataPayload) => createReferenceData<T>(basePath, payload),
        onSuccess: invalidate,
    });

    const update = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ReferenceDataPayload }) =>
            updateReferenceData<T>(basePath, id, payload),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteReferenceData(basePath, id),
        onSuccess: invalidate,
    });

    const deactivate = useMutation({
        mutationFn: (id: string) => deactivateReferenceData(basePath, id),
        onSuccess: invalidate,
    });

    return { list, create, update, remove, deactivate };
}

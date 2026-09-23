import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
import {
  bulkDeleteAlumni, deleteAlumniContact, fetchAlumniContacts,
  fetchAlumniExitYears, submitAlumniContact,
} from '../api-s/requests/AlumniRequest';
import type { CreateAlumniContactPayload, FetchAlumniParams } from '../types/models/Alumni';

const ALUMNI_KEY = ['alumni-contacts'] as const;

export function useSubmitAlumniContact() {
  return useMutation({
    mutationFn: (payload: CreateAlumniContactPayload) => submitAlumniContact(payload),
  });
}

export function useAlumniInfinite(params: FetchAlumniParams = {}) {
  return useInfiniteListQuery([...ALUMNI_KEY, 'infinite', params], fetchAlumniContacts, params);
}

export function useAlumniExitYears() {
  return useQuery({
    queryKey: [...ALUMNI_KEY, 'exit-years'],
    queryFn: fetchAlumniExitYears,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteAlumniContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAlumniContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALUMNI_KEY });
    },
  });
}

export function useBulkDeleteAlumni() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteAlumni(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALUMNI_KEY });
    },
  });
}

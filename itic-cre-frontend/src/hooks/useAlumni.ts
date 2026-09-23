import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
import { deleteAlumniContact, fetchAlumniContacts, submitAlumniContact } from '../api-s/requests/AlumniRequest';
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

export function useDeleteAlumniContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAlumniContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALUMNI_KEY });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdvisors,
  createAdvisor,
  updateAdvisor,
  deactivateAdvisor,
  reactivateAdvisor,
} from '../api-s/requests/AdvisorRequest';
import type { AdvisorListParams, CreateAdvisorData, UpdateAdvisorData } from '../api-s/requests/AdvisorRequest';

export function useAdvisors(params: AdvisorListParams = {}) {
  return useQuery({
    queryKey: ['advisors', params],
    queryFn: () => fetchAdvisors(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdvisorData) => createAdvisor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors'] });
    },
  });
}

export function useUpdateAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdvisorData }) => updateAdvisor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors'] });
    },
  });
}

export function useDeactivateAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateAdvisor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors'] });
    },
  });
}

export function useReactivateAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivateAdvisor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors'] });
    },
  });
}

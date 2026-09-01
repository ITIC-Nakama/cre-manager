import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteListQuery } from './useInfiniteListQuery';
import {
  fetchAdvisors,
  fetchAllAdvisors,
  fetchAdmins,
  createAdvisor,
  updateAdvisor,
  deleteAdvisor,
  deactivateUser,
  reactivateAdvisor,
  assignStudentsToAdvisor,
  removeStudentsFromAdvisor,
  fetchAdvisorDirectory,
  uploadAdvisorPublicPicture,
} from '../api-s/requests/AdvisorRequest';
import type { AdvisorListParams, CreateAdvisorData, UpdateAdvisorData } from '../types/models/Advisor';

export function useAdvisors(params: AdvisorListParams = {}) {
  return useQuery({
    queryKey: ['advisors', params],
    queryFn: () => fetchAdvisors(params),
  });
}

export function useAllAdvisors() {
  return useQuery({
    queryKey: ['advisors', 'all'],
    queryFn: fetchAllAdvisors,
  });
}

export function useAdmins(params: AdvisorListParams = {}) {
  return useQuery({
    queryKey: ['admins', params],
    queryFn: () => fetchAdmins(params),
  });
}

export function useAdvisorsInfinite(params: AdvisorListParams = {}) {
  return useInfiniteListQuery(['advisors', 'infinite', params], fetchAdvisors, params);
}

export function useAdminsInfinite(params: AdvisorListParams = {}) {
  return useInfiniteListQuery(['admins', 'infinite', params], fetchAdmins, params);
}

export function useCreateAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdvisorData) => createAdvisor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors'] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
  });
}

export function useUpdateAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdvisorData }) => updateAdvisor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors'] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
  });
}

export function useDeleteAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdvisor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors'] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors'] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
  });
}

export function useReactivateAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivateAdvisor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors'] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
  });
}

export function useAssignStudentsToAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ advisorId, studentIds }: { advisorId: string; studentIds: string[] }) =>
      assignStudentsToAdvisor(advisorId, studentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'students'] });
    },
  });
}

export function useRemoveStudentsFromAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentIds: string[]) => removeStudentsFromAdvisor(studentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'students'] });
    },
  });
}

export function useAdvisorDirectory() {
  return useQuery({
    queryKey: ['advisor-directory'],
    queryFn: fetchAdvisorDirectory,
  });
}

export function useUploadAdvisorPublicPicture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ advisorId, file }: { advisorId: string; file: File }) =>
      uploadAdvisorPublicPicture(advisorId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisors'] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['advisor-directory'] });
    },
  });
}


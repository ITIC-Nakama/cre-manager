import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdvisors,
  fetchAdmins,
  createAdvisor,
  updateAdvisor,
  deleteAdvisor,
  deactivateUser,
  reactivateAdvisor,
  assignStudentToAdvisor,
  removeStudentFromAdvisor,
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

export function useAdmins(params: AdvisorListParams = {}) {
  return useQuery({
    queryKey: ['admins', params],
    queryFn: () => fetchAdmins(params),
  });
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

export function useAssignStudentToAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ advisorId, studentId }: { advisorId: string; studentId: string }) =>
      assignStudentToAdvisor(advisorId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'students'] });
    },
  });
}

export function useRemoveStudentFromAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ advisorId, studentId }: { advisorId: string; studentId: string }) =>
      removeStudentFromAdvisor(advisorId, studentId),
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


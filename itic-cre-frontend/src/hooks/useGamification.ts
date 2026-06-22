import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGamificationConfigs,
  updateGamificationConfig,
  fetchGrades,
  createGrade,
  updateGrade,
  deleteGrade,
} from '../api-s/requests/GamificationRequest';

export function useGamificationConfigs() {
  return useQuery({
    queryKey: ['gamification-configs'],
    queryFn: fetchGamificationConfigs,
  });
}

export function useUpdateGamificationConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { valeurXP?: number; active?: boolean } }) =>
      updateGamificationConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-configs'] });
    },
  });
}

export function useGrades() {
  return useQuery({
    queryKey: ['gamification-grades'],
    queryFn: fetchGrades,
  });
}

export function useCreateGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { nom: string; xpMinimum: number; ordre: number; icone?: string }) => createGrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-grades'] });
    },
  });
}

export function useUpdateGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nom?: string; xpMinimum?: number; ordre?: number; icone?: string } }) =>
      updateGrade(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-grades'] });
    },
  });
}

export function useDeleteGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-grades'] });
    },
  });
}

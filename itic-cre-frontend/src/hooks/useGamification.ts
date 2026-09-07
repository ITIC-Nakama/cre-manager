import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGamificationConfigs,
  updateGamificationConfig,
  fetchGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  consumePendingLevelUp,
} from '../api-s/requests/GamificationRequest';

export const PENDING_LEVEL_UP_KEY = ['pending-level-up'] as const;

// Verifie (et efface cote serveur) un passage de niveau en attente. Invalidee directement
// depuis le onSuccess de chaque mutation qui peut attribuer de l'XP (voir useSkills.ts,
// useCandidatures.ts, useJobOffers.ts), et refetch aussi au montage de LevelUpWatcher pour
// couvrir le cas ou l'XP a ete accordee hors session (ex: action cote conseiller).
export function usePendingLevelUp() {
  return useQuery({
    queryKey: PENDING_LEVEL_UP_KEY,
    queryFn: consumePendingLevelUp,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

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

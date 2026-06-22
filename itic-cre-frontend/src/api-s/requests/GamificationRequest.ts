import { apiClient } from '../AxiosApiClient';
import type { GamificationConfig, Grade } from '../../types/models/Gamification';

function unwrap<T>(response: { data: unknown }): T {
  const d = response.data as Record<string, unknown>;
  return (d?.data ?? d) as T;
}

// ─── XP CONFIGS ─────────────────────────────────────────────────────────────

export function fetchGamificationConfigs(): Promise<GamificationConfig[]> {
  return apiClient.get('/api/admin/gamification/configs').then((r) => unwrap<GamificationConfig[]>(r));
}

export function updateGamificationConfig(id: string, data: { valeurXP?: number; active?: boolean }): Promise<GamificationConfig> {
  return apiClient.put(`/api/admin/gamification/configs/${id}`, data).then((r) => unwrap<GamificationConfig>(r));
}

// ─── GRADES ─────────────────────────────────────────────────────────────────

export function fetchGrades(): Promise<Grade[]> {
  return apiClient.get('/api/admin/gamification/grades').then((r) => unwrap<Grade[]>(r));
}

export function createGrade(data: { nom: string; xpMinimum: number; ordre: number; icone?: string }): Promise<Grade> {
  return apiClient.post('/api/admin/gamification/grades', data).then((r) => unwrap<Grade>(r));
}

export function updateGrade(id: string, data: { nom?: string; xpMinimum?: number; ordre?: number; icone?: string }): Promise<Grade> {
  return apiClient.put(`/api/admin/gamification/grades/${id}`, data).then((r) => unwrap<Grade>(r));
}

export function deleteGrade(id: string): Promise<void> {
  return apiClient.delete(`/api/admin/gamification/grades/${id}`).then(() => undefined);
}

import { apiClient } from '../AxiosApiClient';
import type {
  Advisor,
  AdvisorPage,
  AdvisorListParams,
  CreateAdvisorData,
  UpdateAdvisorData,
  DeleteOrDeactivateResult,
} from '../../types/models/Advisor';

function unwrap<T>(response: { data: unknown }): T {
  const d = response.data as Record<string, unknown>;
  return (d?.data ?? d) as T;
}

export function fetchAdvisors(params: AdvisorListParams = {}): Promise<AdvisorPage> {
  return apiClient.get('/advisors', { params: { ...params, role: 'ADVISOR' } }).then((r) => unwrap<AdvisorPage>(r));
}

export function fetchAdmins(params: AdvisorListParams = {}): Promise<AdvisorPage> {
  return apiClient.get('/advisors', { params: { ...params, role: 'ADMIN' } }).then((r) => unwrap<AdvisorPage>(r));
}

export function createAdvisor(data: CreateAdvisorData): Promise<Advisor> {
  const role = data.role || 'ADVISOR';
  return apiClient.post('/auth/admin/users', { ...data, role }).then((r) => unwrap<Advisor>(r));
}

export function updateAdvisor(id: string, data: UpdateAdvisorData): Promise<Advisor> {
  return apiClient.put(`/auth/users/${id}`, data).then((r) => unwrap<Advisor>(r));
}

export function deleteAdvisor(id: string): Promise<DeleteOrDeactivateResult> {
  return apiClient.delete(`/auth/users/${id}`).then((r) => unwrap<DeleteOrDeactivateResult>(r));
}

/** Désactivation logique pure — pour conseillers et admins */
export function deactivateUser(id: string): Promise<Advisor> {
  return apiClient.patch(`/auth/users/${id}/deactivate`).then((r) => unwrap<Advisor>(r));
}

export function reactivateAdvisor(id: string): Promise<Advisor> {
  return apiClient.patch(`/auth/users/${id}/reactivate`).then((r) => unwrap<Advisor>(r));
}

import { apiClient } from '../AxiosApiClient';
import type { Advisor } from '../../types/models/Advisor';

function unwrap<T>(response: { data: unknown }): T {
  const d = response.data as Record<string, unknown>;
  return (d?.data ?? d) as T;
}

export interface AdvisorPage {
  content: Advisor[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface AdvisorListParams {
  page?: number;
  size?: number;
  search?: string;
  role?: 'ADVISOR' | 'ADMIN';
}

export function fetchAdvisors(params: AdvisorListParams = {}): Promise<AdvisorPage> {
  return apiClient.get('/advisors', { params: { ...params, role: 'ADVISOR' } }).then((r) => unwrap<AdvisorPage>(r));
}

export function fetchAdmins(params: AdvisorListParams = {}): Promise<AdvisorPage> {
  return apiClient.get('/advisors', { params: { ...params, role: 'ADMIN' } }).then((r) => unwrap<AdvisorPage>(r));
}

export interface CreateAdvisorData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: 'ADVISOR' | 'ADMIN';
  phoneNumber?: string;
  jobTitle?: string;
  lang?: string;
}

export function createAdvisor(data: CreateAdvisorData): Promise<Advisor> {
  const role = data.role || 'ADVISOR';
  return apiClient.post('/auth/admin/users', { ...data, role }).then((r) => unwrap<Advisor>(r));
}

export interface UpdateAdvisorData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  jobTitle?: string;
  password?: string;
}

export function updateAdvisor(id: string, data: UpdateAdvisorData): Promise<Advisor> {
  return apiClient.put(`/auth/users/${id}`, data).then((r) => unwrap<Advisor>(r));
}

export interface DeleteOrDeactivateResult {
  deleted: boolean;
  user: Advisor | null;
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


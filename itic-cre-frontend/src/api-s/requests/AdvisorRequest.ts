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
}

export function fetchAdvisors(params: AdvisorListParams = {}): Promise<AdvisorPage> {
  return apiClient.get('/advisors', { params }).then((r) => unwrap<AdvisorPage>(r));
}

export interface CreateAdvisorData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber?: string;
  jobTitle?: string;
  lang?: string;
}

export function createAdvisor(data: CreateAdvisorData): Promise<Advisor> {
  return apiClient.post('/auth/admin/users', { ...data, role: 'ADVISOR' }).then((r) => unwrap<Advisor>(r));
}

export interface UpdateAdvisorData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  jobTitle?: string;
}

export function updateAdvisor(id: string, data: UpdateAdvisorData): Promise<Advisor> {
  return apiClient.put(`/auth/users/${id}`, data).then((r) => unwrap<Advisor>(r));
}

export function deleteAdvisor(id: string): Promise<void> {
  return apiClient.delete(`/auth/users/${id}`).then(() => undefined);
}

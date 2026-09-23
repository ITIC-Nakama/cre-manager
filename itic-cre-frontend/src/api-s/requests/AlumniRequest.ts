import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';
import type { AlumniContactPage, CreateAlumniContactPayload, FetchAlumniParams } from '../../types/models/Alumni';

export type { FetchAlumniParams };

/** Route publique : aucune authentification requise. */
export function submitAlumniContact(payload: CreateAlumniContactPayload): Promise<void> {
  return apiClient.post('/public/alumni', payload).then(() => undefined);
}

export function fetchAlumniContacts(params: FetchAlumniParams = {}): Promise<AlumniContactPage> {
  const query: Record<string, unknown> = { page: params.page ?? 0, size: params.size ?? 20 };
  if (params.search) query.search = params.search;
  if (params.exitYear !== undefined) query.exitYear = params.exitYear;
  if (params.status !== undefined) query.status = params.status;
  return apiClient.get('/dashboard/alumni', { params: query }).then((response) => unwrap<AlumniContactPage>(response));
}

export function deleteAlumniContact(id: string): Promise<void> {
  return apiClient.delete(`/dashboard/alumni/${id}`).then(() => undefined);
}

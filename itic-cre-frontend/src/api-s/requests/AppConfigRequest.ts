import { apiClient } from '../AxiosApiClient';
import type { AppConfiguration, UpdateAppConfigPayload } from '../../types/models/AppConfig';

/**
 * Récupère la liste de toutes les configurations système (réservé ADMIN/ADVISOR).
 */
export async function fetchAppConfigurations(): Promise<AppConfiguration[]> {
  const response = await apiClient.get<any>('/api/admin/app-config');
  const resData = response.data;
  if (Array.isArray(resData)) {
    return resData;
  }
  if (resData && Array.isArray(resData.data)) {
    return resData.data;
  }
  return [];
}

/**
 * Met à jour un paramètre de configuration système par son ID.
 */
export async function updateAppConfiguration(
  id: string,
  payload: UpdateAppConfigPayload
): Promise<AppConfiguration> {
  const response = await apiClient.put<any>(`/api/admin/app-config/${id}`, payload);
  const resData = response.data;
  return resData?.data ?? resData;
}

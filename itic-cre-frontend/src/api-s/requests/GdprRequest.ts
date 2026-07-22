import { apiClient } from '../AxiosApiClient';

export function exportGdprData(): Promise<Blob> {
  return apiClient.get('/gdpr/export', { responseType: 'blob' }).then((response) => response.data);
}

export function deleteGdprAccount(): Promise<void> {
  return apiClient.delete('/gdpr/delete-account').then(() => undefined);
}

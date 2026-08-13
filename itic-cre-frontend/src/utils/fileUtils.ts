import { apiClient } from '../api-s/AxiosApiClient';
import { toast } from 'sonner';

export async function openFileSecurely(url: string, fallbackName: string = 'document.pdf') {
  try {
    const response = await apiClient.get(url, { responseType: 'blob' });
    const contentType = response.headers['content-type'] || 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);

    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fallbackName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    console.error('Erreur lors de l’ouverture du fichier :', err);
    toast.error('Impossible de charger le fichier');
  }
}

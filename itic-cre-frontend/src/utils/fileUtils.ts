import { apiClient } from '../api-s/AxiosApiClient';
import { toast } from 'sonner';

export async function openFileSecurely(url: string, fallbackName: string = 'document.pdf') {
  // Ouvrir l'onglet immédiatement sur l'événement clic pour éviter le blocage des popups par le navigateur
  const newWindow = window.open('about:blank', '_blank');

  try {
    const response = await apiClient.get(url, { responseType: 'blob' });
    const rawContentType = response.headers['content-type'];
    const contentType = typeof rawContentType === 'string' ? rawContentType : 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);

    if (newWindow) {
      newWindow.location.href = blobUrl;
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fallbackName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    if (newWindow) {
      newWindow.close();
    }
    console.error('Erreur lors de l’ouverture du fichier :', err);
    toast.error('Impossible de charger le fichier');
  }
}

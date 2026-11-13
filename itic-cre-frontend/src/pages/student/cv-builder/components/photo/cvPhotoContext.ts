import { createContext, useContext } from 'react';
import type { CvPhotoInfo } from '../../../../../types/models/CVBuilder';

/** Photo du CV, partagée par la section Identité et l'aperçu (zone photo cliquable). */
export interface CvPhotoController {
  info: CvPhotoInfo;
  /** Adresse locale de la vignette (JPEG privé), null sans photo. */
  thumbnailUrl: string | null;
  busy: boolean;
  /** Ouvre le choix d'un fichier, puis le recadrage. */
  choose: () => void;
  /** « Revenir à ma photo de profil » (ou retirer la photo du CV s'il n'y a pas de photo de profil). */
  revertToProfile: () => void;
}

export const NO_PHOTO: CvPhotoInfo = { source: 'NONE', profilePhotoAvailable: false, key: null };

export const CvPhotoContext = createContext<CvPhotoController | null>(null);

/** null hors de l'assistant (composant rendu seul, tests). */
export function useCvPhoto(): CvPhotoController | null {
  return useContext(CvPhotoContext);
}

/**
 * Calculs du recadrage de la photo du CV (format 5:6 des emplacements), sans DOM : testés seuls.
 * L'image est affichée dans un cadre fixe, « couvrante » (aucun bord vide), déplaçable et zoomable.
 */

export interface CropState {
  /** Zoom de l'étudiant, 1 = la photo couvre juste le cadre. */
  zoom: number;
  /** Position du coin haut gauche de l'image dans le cadre, en pixels du cadre (toujours ≤ 0). */
  x: number;
  y: number;
}

export interface CropGeometry {
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/** Échelle (pixels du cadre par pixel de l'image) pour un zoom donné. */
export function scaleFor(geometry: CropGeometry, zoom: number): number {
  const cover = Math.max(geometry.frameWidth / geometry.imageWidth, geometry.frameHeight / geometry.imageHeight);
  return cover * zoom;
}

/** Garde l'image collée aux bords du cadre : jamais de bande vide. */
export function clampCrop(geometry: CropGeometry, state: CropState): CropState {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.zoom));
  const scale = scaleFor(geometry, zoom);
  const minX = geometry.frameWidth - geometry.imageWidth * scale;
  const minY = geometry.frameHeight - geometry.imageHeight * scale;
  return {
    zoom,
    x: Math.min(0, Math.max(minX, state.x)),
    y: Math.min(0, Math.max(minY, state.y)),
  };
}

/** Position de départ : image centrée, zoom 1. */
export function initialCrop(geometry: CropGeometry): CropState {
  const scale = scaleFor(geometry, 1);
  return clampCrop(geometry, {
    zoom: 1,
    x: (geometry.frameWidth - geometry.imageWidth * scale) / 2,
    y: (geometry.frameHeight - geometry.imageHeight * scale) / 2,
  });
}

/** Change le zoom en gardant le centre du cadre au même endroit de la photo. */
export function zoomAroundCenter(geometry: CropGeometry, state: CropState, zoom: number): CropState {
  const before = scaleFor(geometry, state.zoom);
  const after = scaleFor(geometry, Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)));
  const centerX = (geometry.frameWidth / 2 - state.x) / before;
  const centerY = (geometry.frameHeight / 2 - state.y) / before;
  return clampCrop(geometry, {
    zoom,
    x: geometry.frameWidth / 2 - centerX * after,
    y: geometry.frameHeight / 2 - centerY * after,
  });
}

/** Zone de la photo d'origine à copier dans l'image finale (pixels de l'image). */
export function sourceRect(geometry: CropGeometry, state: CropState): { sx: number; sy: number; sw: number; sh: number } {
  const scale = scaleFor(geometry, state.zoom);
  return {
    sx: -state.x / scale,
    sy: -state.y / scale,
    sw: geometry.frameWidth / scale,
    sh: geometry.frameHeight / scale,
  };
}

import { describe, expect, it } from 'vitest';
import { clampCrop, initialCrop, MAX_ZOOM, sourceRect, zoomAroundCenter, type CropGeometry } from './cropMath';

/** Photo paysage 1600 x 900 dans le cadre 240 x 288 (format 5:6 de l'emplacement des modèles). */
const landscape: CropGeometry = { imageWidth: 1600, imageHeight: 900, frameWidth: 240, frameHeight: 288 };

describe('recadrage de la photo du CV', () => {
  it('au départ, la photo couvre le cadre et elle est centrée', () => {
    const crop = initialCrop(landscape);
    const rect = sourceRect(landscape, crop);
    expect(rect.sh).toBeCloseTo(900);
    expect(rect.sw / rect.sh).toBeCloseTo(5 / 6);
    expect(rect.sx + rect.sw / 2).toBeCloseTo(800);
    expect(rect.sy).toBeCloseTo(0);
  });

  it('jamais de bande vide : la photo reste collée aux bords du cadre', () => {
    const crop = clampCrop(landscape, { zoom: 1, x: 500, y: -500 });
    const rect = sourceRect(landscape, crop);
    expect(rect.sx).toBeCloseTo(0);
    expect(rect.sy).toBeCloseTo(0);
    const far = sourceRect(landscape, clampCrop(landscape, { zoom: 1, x: -99999, y: 0 }));
    expect(far.sx + far.sw).toBeCloseTo(1600);
  });

  it('zoomer garde le centre du cadre au même endroit de la photo, dans les limites', () => {
    const start = initialCrop(landscape);
    const zoomed = zoomAroundCenter(landscape, start, 2);
    const before = sourceRect(landscape, start);
    const after = sourceRect(landscape, zoomed);
    expect(after.sw).toBeCloseTo(before.sw / 2);
    expect(after.sx + after.sw / 2).toBeCloseTo(before.sx + before.sw / 2);
    expect(after.sy + after.sh / 2).toBeCloseTo(before.sy + before.sh / 2);
    expect(zoomAroundCenter(landscape, start, 99).zoom).toBe(MAX_ZOOM);
    expect(zoomAroundCenter(landscape, start, 0.2).zoom).toBe(1);
  });
});

/**
 * Orientation EXIF d'un WebP (14/11/2026) : Chrome et Edge ne l'appliquent pas, le serveur si. La fenêtre de recadrage
 * redresse donc la photo elle-même ; encore faut-il lire l'orientation dans le bloc EXIF du conteneur RIFF.
 */
import { describe, expect, it } from 'vitest';
import { ORIENTED_SAMPLE, webpOrientation } from './photoOrientation';

const bytesOf = (dataUri: string) => Uint8Array.from(atob(dataUri.split(',')[1]), (c) => c.charCodeAt(0));
const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

/** WebP rebâti à partir de ses blocs (taille RIFF et alignement sur 2 octets recalculés). */
function webp(chunks: Array<[string, number[]]>): ArrayBuffer {
  const body: number[] = [...ascii('WEBP')];
  for (const [tag, payload] of chunks) {
    const size = payload.length;
    body.push(...ascii(tag), size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff, ...payload);
    if (size & 1) body.push(0);
  }
  const total = body.length;
  return new Uint8Array([...ascii('RIFF'), total & 0xff, (total >> 8) & 0xff, (total >> 16) & 0xff, (total >> 24) & 0xff, ...body]).buffer;
}

/** Blocs du WebP témoin (2 x 1 px, Orientation 6). */
function sampleChunks(): Array<[string, number[]]> {
  const bytes = bytesOf(ORIENTED_SAMPLE);
  const chunks: Array<[string, number[]]> = [];
  let i = 12;
  while (i + 8 <= bytes.length) {
    const size = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);
    chunks.push([String.fromCharCode(...bytes.subarray(i, i + 4)), [...bytes.subarray(i + 8, i + 8 + size)]]);
    i += 8 + size + (size & 1);
  }
  return chunks;
}

describe('Orientation EXIF d’un WebP de téléphone', () => {
  it('bloc EXIF en TIFF brut (libwebp, Pillow) : orientation lue', () => {
    expect(webpOrientation(bytesOf(ORIENTED_SAMPLE).buffer)).toBe(6);
  });

  it('bloc EXIF précédé de « Exif » et deux octets nuls (autres outils) : orientation lue', () => {
    const prefixed = sampleChunks().map(([tag, payload]): [string, number[]] =>
      tag === 'EXIF' ? [tag, [...ascii('Exif'), 0, 0, ...payload]] : [tag, payload]);
    expect(webpOrientation(webp(prefixed))).toBe(6);
  });

  it('sans EXIF, JPEG, ou bloc de taille impossible : 1 (rien à redresser)', () => {
    const withoutExif = sampleChunks().filter(([tag]) => tag !== 'EXIF');
    expect(webpOrientation(webp(withoutExif))).toBe(1);
    expect(webpOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 0]).buffer)).toBe(1);
    const broken = new Uint8Array(bytesOf(ORIENTED_SAMPLE));
    broken[16] = 0xff; // taille du premier bloc : plus grande que le fichier
    broken[17] = 0xff;
    expect(webpOrientation(broken.buffer)).toBe(1);
  });
});

/**
 * Photo affichée DROITE dans la fenêtre de recadrage.
 *
 * Le serveur applique toujours l'orientation EXIF (photo de téléphone enregistrée couchée), puis la zone choisie.
 * Les navigateurs l'appliquent pour un JPEG, mais pas pour un WebP (Chrome et Edge, novembre 2026) : sans correction,
 * l'étudiant recadrerait une photo couchée et la zone ne correspondrait pas à la photo enregistrée. Un WebP orienté
 * est donc redressé ici, dans un canvas, avant le recadrage ; le fichier envoyé reste l'original.
 */

/** Côté maximal de l'image affichée (comme l'original gardé par le serveur) : la zone est en fractions, donc identique. */
const MAX_SIDE = 2000;

/** WebP de 2 x 1 px marqué « Orientation 6 » : 1 x 2 px une fois affiché si le navigateur applique l'orientation. */
export const ORIENTED_SAMPLE =
  'data:image/webp;base64,UklGRlIAAABXRUJQVlA4WAoAAAAIAAAAAQAAAAAAVlA4TBEAAAAvAQAAAA8Q87//8x8OMqL/AQBFWElGGgAAAE1NACoAAAAIAAEBEgADAAAAAQAGAAAAAAAA';

function isWebp(bytes: Uint8Array): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  return bytes.length > 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
}

/** Valeur EXIF « Orientation » (1 à 8) d'un en-tête TIFF, 1 si absente ou illisible. */
function orientationFromTiff(view: DataView, tiff: number, end: number): number {
  if (tiff + 8 > end) return 1;
  const little = view.getUint16(tiff) === 0x4949; // « II »
  const ifd = tiff + view.getUint32(tiff + 4, little);
  if (ifd < tiff || ifd + 2 > end) return 1;
  const entries = view.getUint16(ifd, little);
  for (let n = 0; n < entries; n++) {
    const entry = ifd + 2 + n * 12;
    if (entry + 12 > end) return 1;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/**
 * Orientation EXIF d'un WebP : conteneur RIFF fait de blocs (code de 4 lettres, taille, contenu aligné sur 2 octets) ;
 * le bloc « EXIF » contient un en-tête TIFF, parfois précédé de « Exif » et de deux octets nuls. 1 sinon.
 */
export function webpOrientation(buffer: ArrayBuffer): number {
  const bytes = new Uint8Array(buffer);
  if (!isWebp(bytes)) return 1;
  const view = new DataView(buffer);
  try {
    let i = 12;
    while (i + 8 <= bytes.length) {
      const size = view.getUint32(i + 4, true);
      const payload = i + 8;
      if (size > bytes.length - payload) return 1;
      if (String.fromCharCode(...bytes.subarray(i, i + 4)) === 'EXIF') {
        let tiff = payload;
        if (size >= 6 && String.fromCharCode(...bytes.subarray(tiff, tiff + 4)) === 'Exif' && bytes[tiff + 4] === 0 && bytes[tiff + 5] === 0) {
          tiff += 6;
        }
        return orientationFromTiff(view, tiff, payload + size);
      }
      i = payload + size + (size & 1);
    }
  } catch {
    return 1;
  }
  return 1;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image illisible'));
    image.src = src;
  });
}

let orientsWebp: Promise<boolean> | undefined;

/** Le navigateur applique-t-il lui-même l'orientation EXIF d'un WebP ? Testé une seule fois. */
export function browserOrientsWebp(): Promise<boolean> {
  orientsWebp ??= loadImage(ORIENTED_SAMPLE)
    .then((image) => image.naturalWidth === 1 && image.naturalHeight === 2)
    .catch(() => false);
  return orientsWebp;
}

/** Dessine l'image redressée (orientation EXIF 2 à 8), réduite à MAX_SIDE au plus. */
function drawUpright(image: HTMLImageElement, orientation: number): HTMLCanvasElement {
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const swap = orientation >= 5;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((swap ? h : w) * scale));
  canvas.height = Math.max(1, Math.round((swap ? w : h) * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas indisponible');
  context.scale(scale, scale);
  const transforms: Record<number, [number, number, number, number, number, number]> = {
    2: [-1, 0, 0, 1, w, 0],
    3: [-1, 0, 0, -1, w, h],
    4: [1, 0, 0, -1, 0, h],
    5: [0, 1, 1, 0, 0, 0],
    6: [0, 1, -1, 0, h, 0],
    7: [0, -1, -1, 0, h, w],
    8: [0, -1, 1, 0, 0, w],
  };
  context.transform(...transforms[orientation]);
  context.drawImage(image, 0, 0);
  return canvas;
}

/**
 * Adresse (objectURL) de la photo à afficher pour le recadrage, droite comme le serveur l'enregistrera.
 * À libérer avec URL.revokeObjectURL. En cas de souci, la photo telle que le navigateur l'affiche.
 */
export async function uprightPhotoUrl(file: Blob): Promise<string> {
  const original = URL.createObjectURL(file);
  try {
    if (file.type !== 'image/webp') return original;
    const orientation = webpOrientation(await file.arrayBuffer());
    if (orientation === 1 || (await browserOrientsWebp())) return original;
    const canvas = drawUpright(await loadImage(original), orientation);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return original;
    URL.revokeObjectURL(original);
    return URL.createObjectURL(blob);
  } catch {
    return original;
  }
}

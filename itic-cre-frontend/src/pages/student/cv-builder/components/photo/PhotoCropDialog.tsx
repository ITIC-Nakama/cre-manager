import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Crop, Loader2, Minus, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CV_PHOTO } from '../../../../../types/models/CVBuilder';
import { useLockBodyScroll } from '../../../../../hooks/useLockBodyScroll';
import {
  clampCrop, initialCrop, MAX_ZOOM, MIN_ZOOM, sourceRect, zoomAroundCenter, type CropGeometry, type CropState,
} from './cropMath';

/** Cadre à l'écran : même format que l'emplacement photo des modèles (5:6). */
const FRAME_WIDTH = 240;
const FRAME_HEIGHT = (FRAME_WIDTH * CV_PHOTO.ratioHeight) / CV_PHOTO.ratioWidth;
const KEY_STEP = 8;

interface Props {
  /** Fichier choisi par l'étudiant ; null = fenêtre fermée. */
  file: File | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (photo: Blob) => void;
}

/**
 * Recadrage de la photo du CV avant l'envoi : la photo couvre un cadre au format de l'emplacement des modèles ;
 * l'étudiant la déplace (souris, doigt ou flèches du clavier) et zoome. L'image envoyée fait 480 x 576 px (JPEG).
 */
export default function PhotoCropDialog({ file, saving, onCancel, onSave }: Props) {
  const { t } = useTranslation();
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const panelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; from: CropState } | null>(null);
  const [geometry, setGeometry] = useState<CropGeometry | null>(null);
  const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  useLockBodyScroll(panelRef, !!file);

  // Nouvelle photo : on repart de zéro (la taille de l'image arrive avec onLoad).
  const [shownUrl, setShownUrl] = useState<string | null>(null);
  if (url !== shownUrl) {
    setShownUrl(url);
    setGeometry(null);
    setError(null);
  }

  useEffect(() => {
    if (!file) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [file, saving, onCancel]);

  if (!file || !url) return null;

  const onImageLoad = () => {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) return;
    const next = { imageWidth: image.naturalWidth, imageHeight: image.naturalHeight, frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT };
    setGeometry(next);
    setCrop(initialCrop(next));
    frameRef.current?.focus();
  };

  const move = (dx: number, dy: number, from = crop) => {
    if (geometry) setCrop(clampCrop(geometry, { ...from, x: from.x + dx, y: from.y + dy }));
  };
  const zoomTo = (zoom: number) => {
    if (geometry) setCrop(zoomAroundCenter(geometry, crop, zoom));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!geometry) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, from: crop };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    move(event.clientX - current.startX, event.clientY - current.startY, current.from);
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onFrameKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [KEY_STEP, 0], ArrowRight: [-KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP],
    };
    if (moves[event.key]) {
      event.preventDefault();
      move(...moves[event.key]);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomTo(crop.zoom + 0.2);
    } else if (event.key === '-') {
      event.preventDefault();
      zoomTo(crop.zoom - 0.2);
    }
  };

  const save = () => {
    const image = imageRef.current;
    if (!geometry || !image) return;
    const canvas = document.createElement('canvas');
    canvas.width = CV_PHOTO.outputWidth;
    canvas.height = CV_PHOTO.outputHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setError(t('studentCvBuilder.photo.cropError', 'Recadrage impossible dans ce navigateur : essaie avec un autre.'));
      return;
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    const { sx, sy, sw, sh } = sourceRect(geometry, crop);
    context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
      else setError(t('studentCvBuilder.photo.cropError', 'Recadrage impossible dans ce navigateur : essaie avec un autre.'));
    }, 'image/jpeg', 0.92);
  };

  const scale = geometry ? Math.max(FRAME_WIDTH / geometry.imageWidth, FRAME_HEIGHT / geometry.imageHeight) * crop.zoom : 1;

  // Portail dans <body> : rendue dans la page, la fenêtre restait sous les bandeaux fixes (installation de
  // l'application, cookies), qui masquaient ses boutons sur mobile.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 animate-fadeIn motion-reduce:animate-none">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="cv-photo-crop-title"
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 max-h-[100dvh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#3f74ff]/10 flex items-center justify-center flex-shrink-0">
              <Crop className="h-4.5 w-4.5 text-[#3f74ff]" />
            </div>
            <h2 id="cv-photo-crop-title" className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('studentCvBuilder.photo.cropTitle', 'Recadre ta photo')}
            </h2>
          </div>
          <button type="button" onClick={onCancel} disabled={saving}
            aria-label={t('studentCvBuilder.photo.cancel', 'Annuler')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            {t('studentCvBuilder.photo.cropHint', 'Fais glisser la photo pour la placer et zoome si besoin. Le cadre a le format de la photo sur ton CV.')}
          </p>
          <div ref={frameRef} tabIndex={0} role="img"
            aria-label={t('studentCvBuilder.photo.cropFrame', 'Cadre de la photo : flèches pour déplacer, + et − pour zoomer')}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            onKeyDown={onFrameKey}
            className="relative overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 cursor-grab active:cursor-grabbing touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff]"
            style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}>
            <img ref={imageRef} src={url} alt="" draggable={false} onLoad={onImageLoad}
              onError={() => setError(t('studentCvBuilder.photo.unreadable', 'Cette photo est illisible : essaie avec une autre (JPEG ou PNG).'))}
              className="absolute pointer-events-none"
              style={geometry ? {
                left: crop.x, top: crop.y, width: geometry.imageWidth * scale, height: geometry.imageHeight * scale, maxWidth: 'none',
              } : { opacity: 0 }} />
            {!geometry && !error && (
              <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin motion-reduce:animate-none text-slate-400" />
            )}
          </div>

          <div className="flex items-center gap-2 w-full max-w-[260px]">
            <button type="button" onClick={() => zoomTo(crop.zoom - 0.2)} disabled={!geometry || crop.zoom <= MIN_ZOOM}
              aria-label={t('studentCvBuilder.photo.zoomOut', 'Dézoomer')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={crop.zoom} disabled={!geometry}
              onChange={(event) => zoomTo(Number(event.target.value))}
              aria-label={t('studentCvBuilder.photo.zoom', 'Zoom de la photo')}
              className="flex-1 accent-[#3f74ff]" />
            <button type="button" onClick={() => zoomTo(crop.zoom + 0.2)} disabled={!geometry || crop.zoom >= MAX_ZOOM}
              aria-label={t('studentCvBuilder.photo.zoomIn', 'Zoomer')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400 text-center">{error}</p>}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-5 pt-0">
          <button type="button" onClick={onCancel} disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50">
            {t('studentCvBuilder.photo.cancel', 'Annuler')}
          </button>
          <button type="button" onClick={save} disabled={!geometry || saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3f74ff] hover:bg-[#2f63ee] text-white text-sm font-semibold cursor-pointer disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
            {t('studentCvBuilder.photo.save', 'Enregistrer la photo')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

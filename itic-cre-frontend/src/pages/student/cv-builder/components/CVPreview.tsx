import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Minus, Plus, ZoomIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RecruiterReadability } from './GuidanceCards';
import { useCvPhoto } from './photo/cvPhotoContext';

/** Largeur de la feuille rendue par le modèle (210 mm à 96 dpi). */
const SHEET_WIDTH_PX = 794;
const ZOOM_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1];

interface Props {
  html: string | null;
  loading: boolean;
  error: string | null;
  /** Nombre de pages du dernier PDF calculé par le serveur (score / téléchargement). */
  pageCount: number | null;
  /** Coordonnées présentes : le CV est bien lu par les logiciels des recruteurs. */
  recruiterReady: boolean;
}

/** Emplacement photo dans la feuille (pixels de la feuille, avant zoom). */
interface PhotoSlot { left: number; top: number; width: number; height: number; empty: boolean }

/**
 * Aperçu exact du PDF : le HTML du modèle rendu par le serveur, affiché dans une iframe sans scripts.
 * allow-same-origin (sans allow-scripts) sert uniquement à mesurer le document : sa hauteur, et l'emplacement
 * photo (data-cv-photo), sur lequel un vrai bouton est posé (ajouter ou changer la photo, au clavier aussi).
 */
export default function CVPreview({ html, loading, error, pageCount, recruiterReady }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [fitZoom, setFitZoom] = useState(0.7);
  const [contentHeight, setContentHeight] = useState(1123);
  const [photoSlot, setPhotoSlot] = useState<PhotoSlot | null>(null);
  const photo = useCvPhoto();

  // Hauteur 0 = iframe chargée pendant que l'onglet Aperçu était masqué (mobile) : on garde la valeur connue.
  const measure = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const height = doc?.documentElement?.scrollHeight ?? 0;
    if (height > 0) setContentHeight(height);
    const slot = doc?.querySelector('[data-cv-photo]');
    const rect = slot?.getBoundingClientRect();
    if (slot && rect && rect.width > 0) {
      setPhotoSlot({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, empty: slot.getAttribute('data-cv-photo') === 'empty' });
    } else if (height > 0) {
      setPhotoSlot(null);
    }
  }, []);

  // Zoom "ajusté à la largeur" tant que l'étudiant n'a pas choisi le sien ; on remesure aussi
  // la feuille quand la zone redevient visible.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === 0) return;
      const available = el.clientWidth - 24;
      setFitZoom(Math.max(0.35, Math.min(1, available / SHEET_WIDTH_PX)));
      measure();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const scale = zoom ?? fitZoom;
  const stepZoom = (direction: 1 | -1) => {
    const current = ZOOM_STEPS.findIndex((z) => z >= scale - 0.001);
    const index = Math.max(0, Math.min(ZOOM_STEPS.length - 1, (current === -1 ? ZOOM_STEPS.length - 1 : current) + direction));
    setZoom(ZOOM_STEPS[index]);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {t('studentCvBuilder.preview.title', 'Aperçu')}
          </span>
          {pageCount !== null && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${pageCount > 1
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
              {t('studentCvBuilder.preview.pages', '{{count}} page', { count: pageCount })}
            </span>
          )}
          <RecruiterReadability ready={recruiterReady} />
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none text-slate-400" />}
        </div>
        {/* Zoom de l'affichage seulement (taille de la feuille à l'écran) : ce n'est pas un score. */}
        <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0" role="group"
          aria-label={t('studentCvBuilder.preview.zoomGroup', 'Zoom de l’aperçu (taille à l’écran, ne change pas ton CV)')}>
          <button type="button" onClick={() => stepZoom(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label={t('studentCvBuilder.preview.zoomOut', 'Dézoomer')}>
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setZoom(null)}
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg text-center tabular-nums font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
            title={t('studentCvBuilder.preview.fit', 'Zoom de l’aperçu, sans effet sur ton CV. Clique pour ajuster à la largeur.')}>
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
            {t('studentCvBuilder.preview.zoomValue', 'Zoom {{value}} %', { value: Math.round(scale * 100) })}
          </button>
          <button type="button" onClick={() => stepZoom(1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label={t('studentCvBuilder.preview.zoomIn', 'Zoomer')}>
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-auto rounded-2xl bg-slate-200/70 dark:bg-slate-950 p-3">
        {html ? (
          <div style={{ width: SHEET_WIDTH_PX * scale, height: contentHeight * scale }} className="relative mx-auto">
            <iframe
              ref={iframeRef}
              title={t('studentCvBuilder.preview.title', 'Aperçu')}
              srcDoc={html}
              sandbox="allow-same-origin"
              onLoad={measure}
              style={{ width: SHEET_WIDTH_PX, height: contentHeight, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0 }}
            />
            {photo && photoSlot && (
              <button type="button" onClick={photo.choose} disabled={photo.busy}
                aria-label={photoSlot.empty ? t('studentCvBuilder.photo.add', 'Ajouter une photo') : t('studentCvBuilder.photo.change', 'Changer la photo')}
                title={photoSlot.empty ? t('studentCvBuilder.photo.add', 'Ajouter une photo') : t('studentCvBuilder.photo.change', 'Changer la photo')}
                className="group absolute flex items-end overflow-hidden rounded-sm cursor-pointer hover:ring-2 hover:ring-[#3f74ff]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff]"
                style={{ left: photoSlot.left * scale, top: photoSlot.top * scale, width: photoSlot.width * scale, height: photoSlot.height * scale }}>
                {!photoSlot.empty && (
                  <span className="w-full bg-slate-900/75 text-white text-[10px] leading-tight font-semibold py-0.5 text-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity motion-reduce:transition-none">
                    {t('studentCvBuilder.photo.change', 'Changer la photo')}
                  </span>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="h-full min-h-64 flex items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

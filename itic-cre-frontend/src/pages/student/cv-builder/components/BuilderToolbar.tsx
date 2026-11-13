import { useFormContext, useWatch } from 'react-hook-form';
import { AlertTriangle, CloudOff, Download, Loader2, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CvBuilderFormValues, CvLang } from '../../../../types/models/CVBuilder';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict' | 'invalid';

interface Props {
  saveStatus: SaveStatus;
  savedAt: Date | null;
  saveError: string | null;
  onReload: () => void;
  onReset: () => void;
  onDownload: () => void;
  onSubmit: () => void;
  downloading: boolean;
  submitting: boolean;
  resetting: boolean;
}

/**
 * Barre de « 2. Complète ton CV » : état du brouillon (« Brouillon enregistré · 12:50 »), langue du CV,
 * Réinitialiser, Télécharger PDF, Envoyer en relecture.
 */
export default function BuilderToolbar({
  saveStatus, savedAt, saveError, onReload, onReset, onDownload, onSubmit, downloading, submitting, resetting,
}: Props) {
  const { t, i18n } = useTranslation();
  const { control, setValue } = useFormContext<CvBuilderFormValues>();
  const cvLang = useWatch({ control, name: 'cvLang' });

  const time = savedAt?.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const segment = (active: boolean) =>
    `px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff] ${active
      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`;
  const secondary = 'inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors motion-reduce:transition-none cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff]';

  return (
    <div className="lg:sticky lg:top-0 z-20 -mx-1 px-1 py-2 bg-slate-50/90 dark:bg-[#020203]/90 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex-1 min-w-[12rem] text-xs" aria-live="polite">
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />{t('studentCvBuilder.save.saving', 'Enregistrement…')}
            </span>
          )}
          {saveStatus === 'saved' && time && (
            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              {t('studentCvBuilder.save.savedAt', 'Brouillon enregistré · {{time}}', { time })}
            </span>
          )}
          {saveStatus === 'dirty' && (
            <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
              {t('studentCvBuilder.save.dirty', 'Modifications en cours d’enregistrement…')}
            </span>
          )}
          {saveStatus === 'idle' && (
            <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
              {t('studentCvBuilder.save.idle', 'Prérempli avec ton compte : ton brouillon sera enregistré dès ta première modification')}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <CloudOff className="h-3.5 w-3.5" />{t('studentCvBuilder.save.error', 'Enregistrement impossible pour le moment : rien n’est perdu, nouvel essai à ta prochaine modification')}
            </span>
          )}
          {saveStatus === 'invalid' && (
            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />{saveError}
            </span>
          )}
          {saveStatus === 'conflict' && (
            <span className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('studentCvBuilder.save.conflict', 'Ton CV a été modifié dans un autre onglet.')}
              <button type="button" onClick={onReload} className="inline-flex items-center gap-1 font-semibold underline cursor-pointer">
                <RefreshCw className="h-3 w-3" />{t('studentCvBuilder.save.reload', 'Recharger')}
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800" role="group"
          aria-label={t('studentCvBuilder.toolbar.lang', 'Langue du CV')}>
          {(['fr', 'en'] as CvLang[]).map((lang) => (
            <button key={lang} type="button" className={segment(cvLang === lang)} onClick={() => setValue('cvLang', lang, { shouldDirty: true })}
              aria-pressed={cvLang === lang} title={t(`studentCvBuilder.toolbar.lang_${lang}`, lang === 'fr' ? 'CV en français' : 'CV en anglais')}>
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onReset} disabled={resetting || submitting} className={secondary}>
            {resetting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <RotateCcw className="h-4 w-4" />}
            {t('studentCvBuilder.toolbar.reset', 'Réinitialiser')}
          </button>
          <button type="button" onClick={onDownload} disabled={downloading} className={secondary}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Download className="h-4 w-4" />}
            {t('studentCvBuilder.toolbar.download', 'Télécharger PDF')}
          </button>
          <button type="button" onClick={onSubmit} disabled={submitting || saveStatus === 'conflict'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3f74ff] hover:bg-[#2f63ee] text-white text-xs font-semibold transition-colors motion-reduce:transition-none cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send className="h-4 w-4" />}
            {t('studentCvBuilder.toolbar.submit', 'Envoyer en relecture')}
          </button>
        </div>
      </div>
    </div>
  );
}

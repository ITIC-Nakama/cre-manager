import { useFormContext, useWatch } from 'react-hook-form';
import { AlertTriangle, ArrowLeft, Check, CloudOff, Download, Loader2, RefreshCw, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CV_TEMPLATE_LABELS, CV_TEMPLATE_SECTIONS, CV_TEMPLATES, type CvBuilderFormValues, type CvLang, type CvTemplateCode,
} from '../../../../types/models/CVBuilder';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict' | 'invalid';

interface Props {
  saveStatus: SaveStatus;
  savedAt: Date | null;
  saveError: string | null;
  onBack: () => void;
  onReload: () => void;
  onDownload: () => void;
  onSubmit: () => void;
  downloading: boolean;
  submitting: boolean;
}

export default function BuilderToolbar({
  saveStatus, savedAt, saveError, onBack, onReload, onDownload, onSubmit, downloading, submitting,
}: Props) {
  const { t, i18n } = useTranslation();
  const { control, setValue, getValues } = useFormContext<CvBuilderFormValues>();
  const [templateCode, cvLang] = useWatch({ control, name: ['templateCode', 'cvLang'] });
  const dirty = { shouldDirty: true } as const;

  /** Changer de modèle reprend son ordre de sections, sauf si l'étudiant a déjà choisi le sien. */
  const chooseTemplate = (code: CvTemplateCode) => {
    setValue('templateCode', code, dirty);
    if (!getValues('data.ordrePersonnalise')) {
      setValue('data.ordreSections', [...CV_TEMPLATE_SECTIONS[code]], dirty);
    }
  };

  const time = savedAt?.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const segment = (active: boolean) =>
    `px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${active
      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`;

  return (
    <div className="lg:sticky lg:top-0 z-20 -mx-1 px-1 py-2 bg-slate-50/90 dark:bg-[#020203]/90 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          {t('studentCvBuilder.toolbar.back', 'Mon CV')}
        </button>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800" role="group"
          aria-label={t('studentCvBuilder.toolbar.template', 'Modèle')}>
          {CV_TEMPLATES.map((code) => (
            <button key={code} type="button" className={segment(templateCode === code)} onClick={() => chooseTemplate(code)}
              aria-pressed={templateCode === code}>
              {t(`studentCvBuilder.templates.${code}`, CV_TEMPLATE_LABELS[code])}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800" role="group"
          aria-label={t('studentCvBuilder.toolbar.lang', 'Langue du CV')}>
          {(['fr', 'en'] as CvLang[]).map((lang) => (
            <button key={lang} type="button" className={segment(cvLang === lang)} onClick={() => setValue('cvLang', lang, dirty)}
              aria-pressed={cvLang === lang}>
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[10rem] text-xs" aria-live="polite">
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />{t('studentCvBuilder.save.saving', 'Enregistrement…')}
            </span>
          )}
          {saveStatus === 'saved' && time && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />{t('studentCvBuilder.save.savedAt', 'Enregistré à {{time}}', { time })}
            </span>
          )}
          {saveStatus === 'dirty' && (
            <span className="text-slate-400">{t('studentCvBuilder.save.dirty', 'Modifications non enregistrées')}</span>
          )}
          {saveStatus === 'idle' && (
            <span className="text-slate-400">{t('studentCvBuilder.save.idle', 'Brouillon prérempli, rien n’est encore enregistré')}</span>
          )}
          {saveStatus === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-rose-600">
              <CloudOff className="h-3.5 w-3.5" />{t('studentCvBuilder.save.error', 'Échec de l’enregistrement, nouvel essai à la prochaine modification')}
            </span>
          )}
          {saveStatus === 'invalid' && (
            <span className="inline-flex items-center gap-1.5 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />{saveError}
            </span>
          )}
          {saveStatus === 'conflict' && (
            <span className="inline-flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('studentCvBuilder.save.conflict', 'Ton CV a été modifié dans un autre onglet.')}
              <button type="button" onClick={onReload} className="inline-flex items-center gap-1 font-semibold underline cursor-pointer">
                <RefreshCw className="h-3 w-3" />{t('studentCvBuilder.save.reload', 'Recharger')}
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onDownload} disabled={downloading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t('studentCvBuilder.toolbar.download', 'Télécharger le PDF')}
          </button>
          <button type="button" onClick={onSubmit} disabled={submitting || saveStatus === 'conflict'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3f74ff] hover:bg-[#2f63ee] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t('studentCvBuilder.toolbar.submit', 'Envoyer à mon conseiller')}
          </button>
        </div>
      </div>
    </div>
  );
}

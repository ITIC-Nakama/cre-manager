import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  CV_TEMPLATE_LABELS, CV_TEMPLATE_SECTIONS, CV_TEMPLATES, type CvBuilderFormValues, type CvTemplateCode,
} from '../../../../types/models/CVBuilder';
import lineaire from '../../../../assets/cv-templates/lineaire.png';
import classique from '../../../../assets/cv-templates/classique.png';
import moderne from '../../../../assets/cv-templates/moderne.png';
import bandeau from '../../../../assets/cv-templates/bandeau.png';

/** Vignettes : haut de la page 1 des exemples de docs/cv-samples (vrai rendu du modèle). */
const THUMBNAILS: Record<CvTemplateCode, string> = { LINEAIRE: lineaire, CLASSIQUE: classique, MODERNE: moderne, BANDEAU: bandeau };

const DESCRIPTIONS: Record<CvTemplateCode, string> = {
  LINEAIRE: 'Parcours en frise, dates à gauche. Idéal si tu as déjà de l’expérience à mettre en avant.',
  CLASSIQUE: 'Sobre et polyvalent. Idéal pour les candidatures en entreprise.',
  MODERNE: 'Filet de couleur et titres soulignés. Marketing, communication.',
  BANDEAU: 'En-tête marine marqué. Profils tech et BTS SIO.',
};

/**
 * « 1. Choisissez un modèle » : une carte par modèle, avec sa vignette et le profil à qui il convient.
 * Changer de modèle reprend son ordre de sections, sauf si l'étudiant a déjà choisi le sien.
 */
export default function TemplatePicker() {
  const { t } = useTranslation();
  const { control, setValue, getValues } = useFormContext<CvBuilderFormValues>();
  const templateCode = useWatch({ control, name: 'templateCode' });

  const choose = (code: CvTemplateCode) => {
    if (code === templateCode) return;
    setValue('templateCode', code, { shouldDirty: true });
    if (!getValues('data.ordrePersonnalise')) {
      setValue('data.ordreSections', [...CV_TEMPLATE_SECTIONS[code]], { shouldDirty: true });
    }
  };

  return (
    <section aria-labelledby="cv-step-template" className="flex flex-col gap-3">
      <h2 id="cv-step-template" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {t('studentCvBuilder.steps.template', '1. Choisis un modèle')}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="group"
        aria-label={t('studentCvBuilder.toolbar.template', 'Modèle')}>
        {CV_TEMPLATES.map((code) => {
          const active = code === templateCode;
          const name = t(`studentCvBuilder.templates.${code}`, CV_TEMPLATE_LABELS[code]);
          return (
            <button key={code} type="button" onClick={() => choose(code)} aria-pressed={active}
              className={`group relative flex flex-col text-left rounded-2xl border-2 overflow-hidden bg-white dark:bg-slate-900 cursor-pointer
                transition-[border-color,box-shadow] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950
                ${active ? 'border-[#3f74ff] shadow-md' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              <span className="block bg-slate-100 dark:bg-slate-800 px-3 pt-3">
                <img src={THUMBNAILS[code]} alt="" loading="lazy"
                  className="w-full h-24 sm:h-auto object-cover object-top rounded-t-md shadow-sm ring-1 ring-black/5" />
              </span>
              <span className="flex flex-col gap-1 p-3">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  {name}
                  {active && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#3f74ff] text-white text-[10px] font-bold">
                      <Check className="h-3 w-3" />{t('studentCvBuilder.templatePicker.selected', 'Choisi')}
                    </span>
                  )}
                </span>
                <span className="text-xs leading-snug text-slate-500 dark:text-slate-400">
                  {t(`studentCvBuilder.templatePicker.${code}`, DESCRIPTIONS[code])}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

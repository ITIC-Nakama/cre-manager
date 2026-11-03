import { useState } from 'react';
import { ChevronDown, Lightbulb, Loader2, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CvCompleteness, CvFormSectionKey } from '../../../../types/models/CVBuilder';

/** Textes par défaut des conseils (codes renvoyés par CvCompletenessService), traduits via studentCvBuilder.tips. */
const TIP_DEFAULTS: Record<string, string> = {
  NAME_MISSING: 'Indique ton prénom et ton nom',
  TITLE_MISSING: 'Ajoute un titre : le poste que tu vises',
  CONTACT_MISSING: 'Renseigne ton e-mail et ton téléphone',
  CITY_MISSING: 'Précise ta ville',
  LINKS_MISSING: 'Ajoute ton LinkedIn (ou un portfolio)',
  SUMMARY_MISSING: 'Ajoute une accroche',
  SUMMARY_TOO_SHORT: 'Développe ton accroche : 2 ou 3 phrases',
  EXPERIENCE_MISSING: 'Ajoute au moins une expérience (stage, job, bénévolat)',
  EXPERIENCE_POINTS: 'Décris chaque expérience en 2 réalisations au moins',
  EXPERIENCE_TO_CONFIRM: 'Confirme les expériences proposées depuis tes candidatures',
  EDUCATION_MISSING: 'Ajoute ta formation',
  SKILLS_FEW: 'Liste au moins 5 compétences',
  SKILLS_MISSING: 'Ajoute tes compétences',
  LANGUAGES_MISSING: 'Ajoute les langues que tu parles',
  LANGUAGE_LEVELS: 'Précise le niveau de tes langues',
  PROJECTS_MISSING: 'Ajoute un projet ou une certification',
  INTERESTS_MISSING: 'Ajoute un ou deux centres d’intérêt',
  TOO_LONG: 'Ton CV fait {{pages}} pages : vise 1 page',
};

interface Props {
  completeness: CvCompleteness | undefined;
  loading: boolean;
  onOpenSection: (section: CvFormSectionKey) => void;
}

export default function CompletenessPanel({ completeness, loading, onOpenSection }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const score = completeness?.score ?? 0;
  const tone = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer">
        <Target className="h-4 w-4 text-[#3f74ff] shrink-0" />
        <span className="text-sm font-bold text-slate-900 dark:text-white">
          {t('studentCvBuilder.completeness.title', 'Complétude')}
        </span>
        <span className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <span className={`block h-full ${tone} transition-all duration-500`} style={{ width: `${score}%` }} />
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white w-14 text-right">
          {loading && !completeness ? <Loader2 className="h-4 w-4 animate-spin inline" /> : `${score}/100`}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && completeness && (
        <div className="px-4 pb-4">
          {completeness.tips.length === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t('studentCvBuilder.completeness.perfect', 'Ton CV est complet. Envoie-le à ton conseiller !')}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {completeness.tips.map((tip) => {
                const label = t(`studentCvBuilder.tips.${tip.code}`, TIP_DEFAULTS[tip.code] ?? tip.code, tip.params);
                return (
                  <li key={tip.code}>
                    <button type="button" disabled={!tip.section} onClick={() => tip.section && onOpenSection(tip.section)}
                      className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer disabled:cursor-default">
                      <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

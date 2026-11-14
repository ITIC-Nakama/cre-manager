import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CVSource } from '../../types/models/CV';
import { CV_TEMPLATE_LABELS, type CvTemplateCode } from '../../types/models/CVBuilder';

interface Props {
  source?: CVSource | null;
  templateCode?: string | null;
  /** Version courte pour les tableaux : « Assistant » seul, le modèle en infobulle. */
  compact?: boolean;
}

/** « Assistant · Moderne » quand le CV a été généré par l'assistant ; rien pour un dépôt de PDF. */
export default function CVSourceBadge({ source, templateCode, compact = false }: Props) {
  const { t } = useTranslation();
  if (source !== 'BUILDER') return null;

  const template = templateCode
    ? t(`studentCvBuilder.templates.${templateCode}`, CV_TEMPLATE_LABELS[templateCode as CvTemplateCode] ?? templateCode)
    : null;
  const label = t('dashboard.cv.source.builder', 'Assistant');
  const title = template
    ? t('dashboard.cv.source.builderTitle', { template, defaultValue: 'Généré avec l’assistant — modèle {{template}}' })
    : t('dashboard.cv.source.builderTitleNoTemplate', 'Généré avec l’assistant');

  return (
    <span title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#3f74ff]/10 text-[#3f74ff] dark:text-[#8fb0ff] max-w-full ${compact ? 'whitespace-nowrap' : ''}`}>
      <Sparkles className="h-3 w-3 shrink-0" />
      <span>{compact || !template ? label : `${label} · ${template}`}</span>
    </span>
  );
}

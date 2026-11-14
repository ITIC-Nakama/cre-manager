import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CV_LIMITS, type CvBuilderFormValues } from '../../../../../types/models/CVBuilder';
import { Field, TagInput } from '../fields';

const GROUPS = [
  { key: 'techniques', label: 'Techniques', hint: 'Langages, frameworks, méthodes : Java, React, SQL, Scrum…' },
  { key: 'outils', label: 'Outils', hint: 'Logiciels et outils : Git, Figma, Excel, Jira…' },
  { key: 'savoirEtre', label: 'Savoir-être', hint: 'Qualités que tes expériences illustrent : rigueur, autonomie…' },
] as const;

export default function CompetencesSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<CvBuilderFormValues>();

  return (
    <>
      {GROUPS.map((group) => (
        <Field group key={group.key} label={t(`studentCvBuilder.competences.${group.key}`, group.label)}
          hint={t(`studentCvBuilder.competences.${group.key}Hint`, group.hint)}>
          <Controller control={control} name={`data.competences.${group.key}`}
            render={({ field }) => (
              <TagInput value={field.value} onChange={field.onChange} max={CV_LIMITS.tags} maxLength={CV_LIMITS.tagLength}
                placeholder={t('studentCvBuilder.tags.placeholder', 'Tape puis Entrée (ou virgule)')} />
            )} />
        </Field>
      ))}
    </>
  );
}

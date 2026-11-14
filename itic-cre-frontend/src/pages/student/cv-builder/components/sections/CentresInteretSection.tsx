import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CV_LIMITS, type CvBuilderFormValues } from '../../../../../types/models/CVBuilder';
import { Field, TagInput } from '../fields';

export default function CentresInteretSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<CvBuilderFormValues>();

  return (
    <Field group label={t('studentCvBuilder.centresInteret.label', 'Tes centres d’intérêt')}
      hint={t('studentCvBuilder.centresInteret.hint', 'Précis plutôt que génériques : « basket en club depuis 8 ans » dit plus que « sport ».')}>
      <Controller control={control} name="data.centresInteret"
        render={({ field }) => (
          <TagInput value={field.value} onChange={field.onChange} max={CV_LIMITS.tags} maxLength={CV_LIMITS.tagLength}
            placeholder={t('studentCvBuilder.tags.placeholder', 'Tape puis Entrée (ou virgule)')} />
        )} />
    </Field>
  );
}

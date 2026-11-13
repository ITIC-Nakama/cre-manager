import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CV_LIMITS, type CvBuilderFormValues } from '../../../../../types/models/CVBuilder';
import { CharCounter, Field, TextArea } from '../fields';
import { SummaryExamples } from '../Examples';

export default function AccrocheSection() {
  const { t } = useTranslation();
  const { register, control, setValue } = useFormContext<CvBuilderFormValues>();
  const accroche = useWatch({ control, name: 'data.accroche' });

  return (
    <>
    <Field label={t('studentCvBuilder.accroche.label', 'Ton accroche')}
      counter={<CharCounter value={accroche} max={CV_LIMITS.summaryLength} />}
      hint={t('studentCvBuilder.accroche.hint', '2 ou 3 phrases : qui tu es, ce que tu cherches (type de contrat, durée, rythme) et ce que tu apportes.')}>
      <TextArea rows={4} maxLength={CV_LIMITS.summaryLength} {...register('data.accroche')}
        placeholder={t('studentCvBuilder.accroche.placeholder', 'Étudiante en Bachelor Développement à ITIC Paris, je cherche une alternance de 12 mois…')} />
    </Field>
    <SummaryExamples current={accroche ?? ''}
      onUse={(text) => setValue('data.accroche', text.slice(0, CV_LIMITS.summaryLength), { shouldDirty: true })} />
    </>
  );
}

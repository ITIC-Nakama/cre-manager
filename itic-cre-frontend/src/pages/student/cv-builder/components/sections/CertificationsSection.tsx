import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CV_LIMITS, type CvBuilderFormValues } from '../../../../../types/models/CVBuilder';
import { AddButton, EntryActions, Field, MonthInput, TextInput } from '../fields';

export default function CertificationsSection() {
  const { t } = useTranslation();
  const { register, control } = useFormContext<CvBuilderFormValues>();
  const certifications = useFieldArray({ control, name: 'data.certifications' });

  return (
    <>
      {certifications.fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {t('studentCvBuilder.certifications.entry', 'Certification {{n}}', { n: index + 1 })}
            </span>
            <EntryActions index={index} count={certifications.fields.length}
              onMove={certifications.move} onRemove={() => certifications.remove(index)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={t('studentCvBuilder.certifications.nom', 'Intitulé')} className="sm:col-span-3">
              <TextInput {...register(`data.certifications.${index}.nom` as const)} maxLength={CV_LIMITS.shortText}
                placeholder={t('studentCvBuilder.certifications.placeholder', 'Ex : TOEIC 850, Projet Voltaire, PIX…')} />
            </Field>
            <Field label={t('studentCvBuilder.certifications.organisme', 'Organisme')} className="sm:col-span-2">
              <TextInput {...register(`data.certifications.${index}.organisme` as const)} maxLength={CV_LIMITS.shortText} />
            </Field>
            <Field label={t('studentCvBuilder.certifications.date', 'Date')}>
              <MonthInput {...register(`data.certifications.${index}.date` as const)} />
            </Field>
          </div>
        </div>
      ))}
      <AddButton label={t('studentCvBuilder.certifications.add', 'Ajouter une certification')}
        disabled={certifications.fields.length >= CV_LIMITS.certifications}
        onClick={() => certifications.append({ nom: '', organisme: '', date: '' })} />
    </>
  );
}

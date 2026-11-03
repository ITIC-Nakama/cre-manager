import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CV_LIMITS, type CvBuilderFormValues } from '../../../../../types/models/CVBuilder';
import { AddButton, EntryActions, Field, MonthInput, TextInput } from '../fields';
import { newEntryId } from '../fieldUtils';

export default function FormationsSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<CvBuilderFormValues>();
  const formations = useFieldArray({ control, name: 'data.formations', keyName: '_key' });

  return (
    <>
      {formations.fields.map((field, index) => (
        <FormationEntry key={field._key} index={index} count={formations.fields.length}
          onMove={formations.move} onRemove={() => formations.remove(index)} />
      ))}
      <AddButton label={t('studentCvBuilder.formations.add', 'Ajouter une formation')}
        disabled={formations.fields.length >= CV_LIMITS.formations}
        onClick={() => formations.append({
          id: newEntryId(), diplome: '', etablissement: '', ville: '', debut: '', fin: '', enCours: false, mention: '',
        })} />
    </>
  );
}

function FormationEntry({ index, count, onMove, onRemove }: {
  index: number; count: number; onMove: (from: number, to: number) => void; onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { register, control } = useFormContext<CvBuilderFormValues>();
  const base = `data.formations.${index}` as const;
  const enCours = useWatch({ control, name: `${base}.enCours` });
  const short = { maxLength: CV_LIMITS.shortText };

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {t('studentCvBuilder.formations.entry', 'Formation {{n}}', { n: index + 1 })}
        </span>
        <EntryActions index={index} count={count} onMove={onMove} onRemove={onRemove} />
      </div>
      <Field label={t('studentCvBuilder.formations.diplome', 'Diplôme ou formation')}>
        <TextInput {...register(`${base}.diplome`)} {...short} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('studentCvBuilder.formations.etablissement', 'Établissement')}>
          <TextInput {...register(`${base}.etablissement`)} {...short} />
        </Field>
        <Field label={t('studentCvBuilder.formations.ville', 'Ville')}>
          <TextInput {...register(`${base}.ville`)} {...short} />
        </Field>
        <Field label={t('studentCvBuilder.dates.debut', 'Début')}>
          <MonthInput {...register(`${base}.debut`)} />
        </Field>
        <Field label={t('studentCvBuilder.dates.fin', 'Fin')}>
          <MonthInput {...register(`${base}.fin`)} disabled={enCours} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer self-start">
        <input type="checkbox" {...register(`${base}.enCours`)} className="h-4 w-4 accent-[#3f74ff]" />
        {t('studentCvBuilder.dates.enCours', 'En cours')}
      </label>
      <Field label={t('studentCvBuilder.formations.mention', 'Mention ou spécialité (facultatif)')}>
        <TextInput {...register(`${base}.mention`)} {...short} />
      </Field>
    </div>
  );
}

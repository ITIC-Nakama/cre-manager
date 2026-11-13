import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CV_LIMITS, type CvBuilderFormValues } from '../../../../../types/models/CVBuilder';
import { AddButton, CharCounter, EntryActions, Field, TagInput, TextArea, TextInput } from '../fields';
import { newEntryId } from '../fieldUtils';

export default function ProjetsSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<CvBuilderFormValues>();
  const projets = useFieldArray({ control, name: 'data.projets', keyName: '_key' });

  return (
    <>
      {projets.fields.map((field, index) => (
        <ProjetEntry key={field._key} index={index} count={projets.fields.length}
          onMove={projets.move} onRemove={() => projets.remove(index)} />
      ))}
      <AddButton label={t('studentCvBuilder.projets.add', 'Ajouter un projet')}
        disabled={projets.fields.length >= CV_LIMITS.projets}
        onClick={() => projets.append({ id: newEntryId(), nom: '', lien: '', description: '', technos: [] })} />
    </>
  );
}

function ProjetEntry({ index, count, onMove, onRemove }: {
  index: number; count: number; onMove: (from: number, to: number) => void; onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { register, control } = useFormContext<CvBuilderFormValues>();
  const base = `data.projets.${index}` as const;
  const description = useWatch({ control, name: `${base}.description` });

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {t('studentCvBuilder.projets.entry', 'Projet {{n}}', { n: index + 1 })}
        </span>
        <EntryActions index={index} count={count} onMove={onMove} onRemove={onRemove} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('studentCvBuilder.projets.nom', 'Nom du projet')}>
          <TextInput {...register(`${base}.nom`)} maxLength={CV_LIMITS.shortText} />
        </Field>
        <Field label={t('studentCvBuilder.projets.lien', 'Lien (facultatif)')}>
          <TextInput type="url" placeholder="https://" maxLength={300} {...register(`${base}.lien`)} />
        </Field>
      </div>
      <Field label={t('studentCvBuilder.projets.description', 'Description')}
        counter={<CharCounter value={description} max={CV_LIMITS.description} />}
        hint={t('studentCvBuilder.projets.descriptionHint', 'Le but du projet et ton rôle, en une ou deux phrases.')}>
        <TextArea maxLength={CV_LIMITS.description} {...register(`${base}.description`)} />
      </Field>
      <Field group label={t('studentCvBuilder.projets.technos', 'Technologies')}>
        <Controller control={control} name={`${base}.technos`}
          render={({ field }) => (
            <TagInput value={field.value} onChange={field.onChange} max={CV_LIMITS.tags} maxLength={CV_LIMITS.tagLength}
              placeholder={t('studentCvBuilder.tags.placeholder', 'Tape puis Entrée (ou virgule)')} />
          )} />
      </Field>
    </div>
  );
}

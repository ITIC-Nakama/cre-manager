import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { CV_LIMITS, type CvBuilderFormValues } from '../../../../../types/models/CVBuilder';
import { AddButton, EntryActions, Field, MonthInput, PointsEditor, TextInput } from '../fields';
import { newEntryId } from '../fieldUtils';

export default function ExperiencesSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<CvBuilderFormValues>();
  // keyName distinct : chaque entrée a déjà son propre champ "id", repris par le serveur.
  const experiences = useFieldArray({ control, name: 'data.experiences', keyName: '_key' });

  return (
    <>
      {experiences.fields.map((field, index) => (
        <ExperienceEntry key={field._key} index={index} count={experiences.fields.length}
          onMove={experiences.move} onRemove={() => experiences.remove(index)} />
      ))}
      <AddButton label={t('studentCvBuilder.experiences.add', 'Ajouter une expérience')}
        disabled={experiences.fields.length >= CV_LIMITS.experiences}
        onClick={() => experiences.append({
          id: newEntryId(), poste: '', entreprise: '', ville: '', typeContrat: '',
          debut: '', fin: null, enCours: false, points: [''], aConfirmer: false,
        })} />
    </>
  );
}

function ExperienceEntry({ index, count, onMove, onRemove }: {
  index: number; count: number; onMove: (from: number, to: number) => void; onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { register, control, setValue } = useFormContext<CvBuilderFormValues>();
  const base = `data.experiences.${index}` as const;
  const enCours = useWatch({ control, name: `${base}.enCours` });
  const aConfirmer = useWatch({ control, name: `${base}.aConfirmer` });
  const short = { maxLength: CV_LIMITS.shortText };

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {t('studentCvBuilder.experiences.entry', 'Expérience {{n}}', { n: index + 1 })}
        </span>
        <EntryActions index={index} count={count} onMove={onMove} onRemove={onRemove} />
      </div>

      {aConfirmer && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            {t('studentCvBuilder.experiences.toConfirm', 'Proposée depuis ta candidature au contrat validé. Vérifie les dates et ajoute tes réalisations.')}
          </span>
          <button type="button" onClick={() => setValue(`${base}.aConfirmer`, false, { shouldDirty: true })}
            className="self-start sm:self-auto px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer">
            {t('studentCvBuilder.experiences.confirm', 'Confirmer')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('studentCvBuilder.experiences.poste', 'Poste')}>
          <TextInput {...register(`${base}.poste`)} {...short} />
        </Field>
        <Field label={t('studentCvBuilder.experiences.entreprise', 'Entreprise')}>
          <TextInput {...register(`${base}.entreprise`)} {...short} />
        </Field>
        <Field label={t('studentCvBuilder.experiences.typeContrat', 'Type de contrat')}
          hint={t('studentCvBuilder.experiences.typeContratHint', 'Alternance, stage, CDD, job étudiant…')}>
          <TextInput {...register(`${base}.typeContrat`)} {...short} />
        </Field>
        <Field label={t('studentCvBuilder.experiences.ville', 'Ville')}>
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

      <fieldset className="flex flex-col gap-2 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
        <legend className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {t('studentCvBuilder.experiences.company', 'L’entreprise en une ligne (facultatif)')}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={t('studentCvBuilder.experiences.chiffreAffaires', 'Chiffre d’affaires')}>
            <TextInput {...register(`${base}.chiffreAffaires`)} {...short}
              placeholder={t('studentCvBuilder.experiences.chiffreAffairesPlaceholder', 'Ex : 3 M€')} />
          </Field>
          <Field label={t('studentCvBuilder.experiences.effectif', 'Effectif')}>
            <TextInput {...register(`${base}.effectif`)} {...short}
              placeholder={t('studentCvBuilder.experiences.effectifPlaceholder', 'Ex : 35 collaborateurs')} />
          </Field>
          <Field label={t('studentCvBuilder.experiences.secteur', 'Secteur')}>
            <TextInput {...register(`${base}.secteur`)} {...short}
              placeholder={t('studentCvBuilder.experiences.secteurPlaceholder', 'Ex : Hôtellerie')} />
          </Field>
        </div>
        <span className="text-[11px] leading-snug text-slate-400 dark:text-slate-500">
          {t('studentCvBuilder.experiences.companyHint', 'Aide le recruteur à situer l’entreprise. Sur le CV : « CA 3 M€ – effectif 35 collaborateurs (Hôtellerie) ».')}
        </span>
      </fieldset>

      <Field group label={t('studentCvBuilder.experiences.points', 'Réalisations')}
        hint={t('studentCvBuilder.experiences.pointsHint', 'Commence par un verbe d’action et chiffre quand tu peux. Entoure un chiffre de ** pour le mettre en gras : **+15 %**.')}>
        <Controller control={control} name={`${base}.points`}
          render={({ field }) => (
            <PointsEditor value={field.value} onChange={field.onChange} max={CV_LIMITS.points} maxLength={CV_LIMITS.pointLength} />
          )} />
      </Field>
    </div>
  );
}

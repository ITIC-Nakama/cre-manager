import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CV_LANGUAGE_LEVELS, CV_LIMITS, type CvBuilderFormValues } from '../../../../../types/models/CVBuilder';
import { AddButton, EntryActions, TextInput } from '../fields';
import { compactFieldClass } from '../fieldUtils';

export default function LanguesSection() {
  const { t } = useTranslation();
  const { register, control } = useFormContext<CvBuilderFormValues>();
  const langues = useFieldArray({ control, name: 'data.langues' });

  return (
    <>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('studentCvBuilder.langues.hint', 'Niveaux du cadre européen (CECRL) : A1-A2 débutant, B1-B2 indépendant, C1-C2 expérimenté.')}
      </p>
      {langues.fields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-2">
          <TextInput {...register(`data.langues.${index}.langue` as const)} maxLength={CV_LIMITS.shortText}
            placeholder={t('studentCvBuilder.langues.placeholder', 'Anglais')} />
          <select {...register(`data.langues.${index}.niveau` as const)} className={`${compactFieldClass()} !w-44 shrink-0`}>
            <option value="">{t('studentCvBuilder.langues.niveau', 'Niveau…')}</option>
            {CV_LANGUAGE_LEVELS.map((level) => (
              <option key={level} value={level}>{t(`studentCvBuilder.levels.${level}`, level)}</option>
            ))}
          </select>
          <EntryActions index={index} count={langues.fields.length} onMove={langues.move} onRemove={() => langues.remove(index)} />
        </div>
      ))}
      <AddButton label={t('studentCvBuilder.langues.add', 'Ajouter une langue')}
        disabled={langues.fields.length >= CV_LIMITS.langues}
        onClick={() => langues.append({ langue: '', niveau: '' })} />
    </>
  );
}

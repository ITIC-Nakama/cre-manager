import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CV_LIMITS, CV_LINK_TYPES, type CvBuilderFormValues } from '../../../../../types/models/CVBuilder';
import { AddButton, EntryActions, Field, TextInput } from '../fields';
import { compactFieldClass } from '../fieldUtils';

export default function IdentiteSection() {
  const { t } = useTranslation();
  const { register, control } = useFormContext<CvBuilderFormValues>();
  const liens = useFieldArray({ control, name: 'data.identite.liens' });
  const short = { maxLength: CV_LIMITS.shortText };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('studentCvBuilder.identite.prenom', 'Prénom')}>
          <TextInput {...register('data.identite.prenom')} {...short} autoComplete="given-name" />
        </Field>
        <Field label={t('studentCvBuilder.identite.nom', 'Nom')}>
          <TextInput {...register('data.identite.nom')} {...short} autoComplete="family-name" />
        </Field>
      </div>
      <Field label={t('studentCvBuilder.identite.titre', 'Titre du CV')}
        hint={t('studentCvBuilder.identite.titreHint', 'Le poste visé, en quelques mots : « Développeur full-stack en alternance ».')}>
        <TextInput {...register('data.identite.titre')} {...short} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('studentCvBuilder.identite.email', 'E-mail')}>
          <TextInput type="email" {...register('data.identite.email')} {...short} autoComplete="email" />
        </Field>
        <Field label={t('studentCvBuilder.identite.telephone', 'Téléphone')}>
          <TextInput type="tel" {...register('data.identite.telephone')} {...short} autoComplete="tel" />
        </Field>
        <Field label={t('studentCvBuilder.identite.ville', 'Ville')}>
          <TextInput {...register('data.identite.ville')} {...short} autoComplete="address-level2" />
        </Field>
        <Field label={t('studentCvBuilder.identite.mobilite', 'Mobilité')}
          hint={t('studentCvBuilder.identite.mobiliteHint', 'Ex : Île-de-France, télétravail possible.')}>
          <TextInput {...register('data.identite.mobilite')} {...short} />
        </Field>
      </div>

      <Field group label={t('studentCvBuilder.identite.liens', 'Liens')}
        hint={t('studentCvBuilder.identite.liensHint', 'LinkedIn, GitHub, portfolio… Les adresses doivent commencer par https://')}>
        <div className="flex flex-col gap-2">
          {liens.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <select {...register(`data.identite.liens.${index}.type` as const)} className={`${compactFieldClass()} !w-36 shrink-0`}>
                {CV_LINK_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`studentCvBuilder.linkTypes.${type}`, type)}</option>
                ))}
              </select>
              <TextInput type="url" placeholder="https://" maxLength={300}
                {...register(`data.identite.liens.${index}.url` as const)} />
              <EntryActions index={index} count={liens.fields.length} onMove={liens.move} onRemove={() => liens.remove(index)} />
            </div>
          ))}
          <AddButton label={t('studentCvBuilder.identite.addLien', 'Ajouter un lien')}
            disabled={liens.fields.length >= CV_LIMITS.links}
            onClick={() => liens.append({ type: liens.fields.length === 0 ? 'LINKEDIN' : 'AUTRE', url: '' })} />
        </div>
      </Field>

      <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 cursor-pointer">
        <input type="checkbox" {...register('data.identite.afficherPhoto')} className="mt-0.5 h-4 w-4 accent-[#3f74ff]" />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('studentCvBuilder.identite.photo', 'Afficher ma photo de profil')}
          </span>
          <span className="text-xs text-slate-500">
            {t('studentCvBuilder.identite.photoHint', 'Facultatif. La photo de ton compte est reprise telle quelle (JPEG ou PNG). Change-la depuis tes paramètres.')}
          </span>
        </span>
      </label>
    </>
  );
}

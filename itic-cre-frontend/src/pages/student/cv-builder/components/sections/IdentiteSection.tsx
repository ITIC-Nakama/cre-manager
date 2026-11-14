import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ImagePlus } from 'lucide-react';
import { CV_LIMITS, CV_LINK_TYPES, type CvBuilderFormValues } from '../../../../../types/models/CVBuilder';
import { AddButton, EntryActions, Field, TextInput } from '../fields';
import { compactFieldClass } from '../fieldUtils';
import { useCvPhoto } from '../photo/cvPhotoContext';

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

      <PhotoField />
    </>
  );
}

/**
 * Photo du CV : par défaut la photo de profil (case cochée dès qu'il y en a une), « Changer la photo » pour une
 * photo propre au CV (recadrée au format du modèle), « Revenir à ma photo de profil ».
 */
function PhotoField() {
  const { t } = useTranslation();
  const { register, control } = useFormContext<CvBuilderFormValues>();
  const shown = useWatch({ control, name: 'data.identite.afficherPhoto' });
  const photo = useCvPhoto();
  if (!photo) return null;

  const { info, thumbnailUrl, ratio, busy, choose, revertToProfile } = photo;
  const hasPhoto = info.source !== 'NONE';
  const actionClass = 'text-xs font-semibold text-[#3f74ff] dark:text-[#8fb0ff] hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-default';
  const hint = info.source === 'CV'
    ? t('studentCvBuilder.photo.hintCv', 'Photo choisie pour ton CV seulement : ta photo de profil ne change pas.')
    : info.source === 'PROFILE'
      ? t('studentCvBuilder.photo.hintProfile', 'C’est la photo de ton compte. « Changer la photo » en met une autre sur ton CV seulement.')
      : t('studentCvBuilder.photo.hintNone', 'Facultatif : sans photo, l’emplacement reste vide sur ton CV. JPEG ou PNG, 5 Mo maximum.');

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800">
      {/* Vignette cliquable à la souris ; au clavier et pour les lecteurs d'écran, le bouton texte à côté suffit. */}
      <button type="button" onClick={choose} disabled={busy} tabIndex={-1} aria-hidden="true"
        style={{ width: 60, height: Math.round((60 * ratio.height) / ratio.width) }}
        className="shrink-0 rounded-md overflow-hidden cursor-pointer ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff]">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className={`w-full h-full object-cover ${shown ? '' : 'opacity-40 grayscale'}`} />
        ) : (
          <span className="flex items-center justify-center h-full border border-dashed border-slate-300 dark:border-slate-600 rounded-md text-slate-400">
            <ImagePlus className="h-4 w-4" />
          </span>
        )}
      </button>
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t('studentCvBuilder.photo.title', 'Photo')}
        </span>
        {hasPhoto && (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" {...register('data.identite.afficherPhoto')} className="h-4 w-4 accent-[#3f74ff]" />
            {info.source === 'CV'
              ? t('studentCvBuilder.photo.showCv', 'Afficher ma photo sur le CV')
              : t('studentCvBuilder.identite.photo', 'Afficher ma photo de profil')}
          </label>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <button type="button" onClick={choose} disabled={busy} className={actionClass}>
            {hasPhoto ? t('studentCvBuilder.photo.change', 'Changer la photo') : t('studentCvBuilder.photo.add', 'Ajouter une photo')}
          </button>
          {info.source === 'CV' && (
            <button type="button" onClick={revertToProfile} disabled={busy} className={actionClass}>
              {info.profilePhotoAvailable
                ? t('studentCvBuilder.photo.revert', 'Revenir à ma photo de profil')
                : t('studentCvBuilder.photo.remove', 'Retirer cette photo')}
            </button>
          )}
        </div>
        <span className="text-xs text-slate-500">{hint}</span>
      </div>
    </div>
  );
}

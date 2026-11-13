import { useCallback, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useFormContext, useWatch } from 'react-hook-form';
import { CV_DRAFT_KEY, useMyCvPhotoUrl, useRemoveMyCvPhoto, useUploadMyCvPhoto } from '../../../../../hooks/useCVBuilder';
import { getApiErrorMessage } from '../../../../../utils/errorHelper';
import {
  CV_PHOTO, CV_TEMPLATE_PHOTO_RATIO, type CvBuilderFormValues, type CvDraftResponse, type CvPhotoInfo, type CvPhotoZone,
} from '../../../../../types/models/CVBuilder';
import { CvPhotoContext, NO_PHOTO, type CvPhotoController } from './cvPhotoContext';
import PhotoCropDialog from './PhotoCropDialog';

interface Props {
  initial: CvPhotoInfo | undefined;
  /** Photo changée : uploaded = nouvelle photo du CV (à afficher), sinon retour à la photo de profil. */
  onChanged: (info: CvPhotoInfo, uploaded: boolean) => void;
  children: ReactNode;
}

/**
 * Photo du CV : choix du fichier (JPEG ou PNG, 5 Mo maximum), recadrage au format des modèles, envoi.
 * Cette photo ne sert qu'au CV : la photo de profil du compte ne change jamais ici.
 */
export default function CvPhotoProvider({ initial, onChanged, children }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [info, setInfo] = useState<CvPhotoInfo>(initial ?? NO_PHOTO);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadMyCvPhoto();
  const remove = useRemoveMyCvPhoto();
  // Format du modèle choisi : cadre de recadrage et vignette (carré pour le Linéaire, portrait sinon).
  const { control } = useFormContext<CvBuilderFormValues>();
  const template = useWatch({ control, name: 'templateCode' });
  const ratio = CV_TEMPLATE_PHOTO_RATIO[template] ?? CV_TEMPLATE_PHOTO_RATIO.CLASSIQUE;
  const thumbnailUrl = useMyCvPhotoUrl(info.key, template);

  const apply = useCallback((next: CvPhotoInfo, uploaded: boolean) => {
    setInfo(next);
    // Le brouillon en cache sert au prochain montage de l'éditeur (réinitialisation, rechargement).
    queryClient.setQueryData<CvDraftResponse>(CV_DRAFT_KEY, (draft) => (draft ? { ...draft, photo: next } : draft));
    onChanged(next, uploaded);
  }, [queryClient, onChanged]);

  const choose = useCallback(() => inputRef.current?.click(), []);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    if (!(CV_PHOTO.types as readonly string[]).includes(chosen.type)) {
      toast.error(t('studentCvBuilder.photo.invalidType', 'Seules les photos JPEG ou PNG sont acceptées.'));
      return;
    }
    if (chosen.size > CV_PHOTO.maxBytes) {
      toast.error(t('studentCvBuilder.photo.tooLarge', 'La photo dépasse 5 Mo : choisis-en une plus légère.'));
      return;
    }
    setFile(chosen);
  };

  const save = async (zone: CvPhotoZone) => {
    if (!file) return;
    try {
      const next = await upload.mutateAsync({ file, zone });
      setFile(null);
      apply(next, true);
      toast.success(t('studentCvBuilder.photo.saved', 'Photo enregistrée pour ton CV. Ta photo de profil ne change pas.'));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('studentCvBuilder.photo.saveError', 'La photo n’a pas pu être enregistrée, réessaie.')));
    }
  };

  const revertToProfile = useCallback(async () => {
    try {
      const next = await remove.mutateAsync();
      apply(next, false);
      toast.success(next.source === 'PROFILE'
        ? t('studentCvBuilder.photo.reverted', 'Ton CV reprend ta photo de profil.')
        : t('studentCvBuilder.photo.removed', 'Photo retirée de ton CV.'));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('studentCvBuilder.photo.saveError', 'La photo n’a pas pu être enregistrée, réessaie.')));
    }
  }, [remove, apply, t]);

  const busy = upload.isPending || remove.isPending;
  const value = useMemo<CvPhotoController>(
    () => ({ info, thumbnailUrl, ratio, busy, choose, revertToProfile: () => void revertToProfile() }),
    [info, thumbnailUrl, ratio, busy, choose, revertToProfile],
  );

  return (
    <CvPhotoContext.Provider value={value}>
      {children}
      <input ref={inputRef} type="file" name="cv-photo" accept="image/jpeg,image/png" className="hidden"
        tabIndex={-1} aria-hidden="true" onChange={onFile} />
      <PhotoCropDialog file={file} ratio={ratio} saving={upload.isPending} onCancel={() => setFile(null)}
        onSave={(zone) => void save(zone)} />
    </CvPhotoContext.Provider>
  );
}

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../components/shared/ConfirmDialog';

/**
 * Confirmation avant de fermer un formulaire modifié (brouillons, PROPOSITIONS-JULES §2) : `requestClose` ferme tout
 * de suite si rien n'a changé, sinon demande « Fermer sans envoyer ? » (le brouillon reste enregistré).
 */
export function useCloseGuard(dirty: boolean, onClose: () => void, audience: 'staff' | 'student' = 'staff') {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);

  const requestClose = useCallback(() => {
    if (dirty) setAsking(true);
    else onClose();
  }, [dirty, onClose]);

  const dialog = (
    <ConfirmDialog
      isOpen={asking}
      title={t('drafts.close_title', 'Fermer sans envoyer ?')}
      message={audience === 'student'
        ? t('drafts.close_message_student', 'Ton texte n’est pas envoyé. Il reste enregistré comme brouillon sur cet appareil : tu pourras le reprendre.')
        : t('drafts.close_message_staff', 'Votre texte n’est pas envoyé. Il reste enregistré comme brouillon sur cet appareil : vous pourrez le reprendre.')}
      confirmLabel={t('drafts.close_confirm', 'Fermer')}
      cancelLabel={t('drafts.close_cancel', 'Continuer')}
      onConfirm={() => { setAsking(false); onClose(); }}
      onClose={() => setAsking(false)}
    />
  );

  return { requestClose, dialog };
}

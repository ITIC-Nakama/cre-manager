import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import TypedConfirmDialog from './TypedConfirmDialog';
import { deleteAccountPermanently } from '../../api-s/requests/AdvisorRequest';

export interface AccountToDelete {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    /** Étudiant : tout est effacé ; équipe : ses contenus restent, signés « Compte supprimé ». */
    kind: 'student' | 'staff';
}

/** Suppression définitive d'un compte (admin) : il faut retaper l'adresse e-mail du compte. */
export default function DeleteAccountDialog({ account, onClose, onDeleted }: {
    account: AccountToDelete | null;
    onClose: () => void;
    onDeleted?: () => void;
}) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const name = account ? `${account.firstName} ${account.lastName}`.trim() : '';

    const confirm = async () => {
        if (!account) return;
        setLoading(true);
        try {
            await deleteAccountPermanently(account.id, account.email);
            toast.success(t('accounts.delete_success', 'Compte de {{name}} supprimé définitivement.', { name }));
            await queryClient.invalidateQueries();
            onClose();
            onDeleted?.();
        } catch (err: unknown) {
            const key = (err as { response?: { data?: { messageKey?: string; message?: string } } })?.response?.data;
            toast.error(key?.message ?? t('accounts.delete_error', 'La suppression a échoué.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <TypedConfirmDialog
            isOpen={!!account}
            title={t('accounts.delete_title', 'Supprimer définitivement ce compte ?')}
            message={account?.kind === 'student'
                ? t('accounts.delete_student_message', 'Le compte de {{name}} sera supprimé, avec son CV, ses fichiers, ses candidatures, ses messages et ses notes. C’est irréversible.', { name })
                : t('accounts.delete_staff_message', 'Le compte de {{name}} sera supprimé. Les offres, commentaires, notes et messages qu’il a créés restent, signés « Compte supprimé ». C’est irréversible.', { name })}
            confirmationValue={account?.email ?? ''}
            confirmationLabel={t('accounts.delete_input_label', 'Pour confirmer, saisissez l’adresse e-mail du compte')}
            confirmLabel={t('accounts.delete_confirm', 'Supprimer définitivement')}
            loading={loading}
            onConfirm={confirm}
            onClose={onClose}
        />
    );
}

import { useTranslation } from 'react-i18next';
import ConfirmDialog from './ConfirmDialog';

interface Props {
    /** Étudiant dont on confirme la réactivation ; null = dialogue fermé. */
    student: { firstName: string; lastName: string } | null;
    loading: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/**
 * Confirmation avant de réactiver un compte étudiant (conseillers et admins, `PATCH /auth/users/{id}/reactivate`).
 * Utilisée depuis la fiche étudiant et depuis la vue « Comptes désactivés » de la validation des CV.
 */
export default function ReactivateAccountDialog({ student, loading, onConfirm, onClose }: Props) {
    const { t } = useTranslation();
    return (
        <ConfirmDialog
            isOpen={!!student}
            tone="positive"
            title={t('dashboard.etudiants.confirm_reactivate_title')}
            message={student
                ? t('dashboard.etudiants.confirm_reactivate', { name: `${student.firstName} ${student.lastName}` })
                : ''}
            confirmLabel={t('dashboard.etudiants.actions.reactivate_account')}
            loading={loading}
            onConfirm={onConfirm}
            onClose={onClose}
        />
    );
}

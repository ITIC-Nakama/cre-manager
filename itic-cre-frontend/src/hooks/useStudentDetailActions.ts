import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNotifyStudent, useDeactivateStudent, useReactivateStudent, useAnonymizeStudent } from './useDashboard';
import { useCVByStudent, useCVStatuts } from './useCV';
import type { StudentRow } from '../types/models/Dashboard';

interface Options {
    isAdmin: boolean;
    /** Appele apres une anonymisation reussie — laisse la page fermer sa propre fenetre de detail. */
    onAnonymizeSuccess?: () => void;
}

/**
 * Regroupe l'etat, les mutations et les handlers necessaires pour brancher StudentDetailModal
 * (notifier, desactiver/reactiver, declarer un contrat, anonymiser RGPD, voir le CV) — utilise a
 * l'identique par EtudiantsPage et OffresPage (liste des candidats d'une offre).
 */
export function useStudentDetailActions({ isAdmin, onAnonymizeSuccess }: Options) {
    const { t } = useTranslation();
    const notifyMutation = useNotifyStudent();
    const deactivateMutation = useDeactivateStudent();
    const reactivateMutation = useReactivateStudent();
    const anonymizeMutation = useAnonymizeStudent();

    const [notifyingStudent, setNotifyingStudent] = useState<StudentRow | null>(null);
    const [declaringContractFor, setDeclaringContractFor] = useState<StudentRow | null>(null);
    const [viewingCvStudentId, setViewingCvStudentId] = useState<string | null>(null);
    const [anonymizeTarget, setAnonymizeTarget] = useState<StudentRow | null>(null);
    const [anonymizing, setAnonymizing] = useState(false);
    const [deactivateTarget, setDeactivateTarget] = useState<StudentRow | null>(null);
    const [deactivateLoading, setDeactivateLoading] = useState(false);

    const { data: studentCv, isLoading: studentCvLoading } = useCVByStudent(viewingCvStudentId);
    const { data: cvStatuts = [] } = useCVStatuts();

    const handleNotifyStudent = async (message?: string) => {
        if (!notifyingStudent) return;
        try {
            await notifyMutation.mutateAsync({ studentId: notifyingStudent.id, message });
            toast.success(t('dashboard.notify_modal.success', { name: `${notifyingStudent.firstName} ${notifyingStudent.lastName}` }));
        } catch {
            toast.error(t('dashboard.notify_modal.error', { email: notifyingStudent.email }));
        }
    };

    const handleDeactivateStudent = (student: StudentRow) => setDeactivateTarget(student);

    const handleConfirmDeactivate = async () => {
        if (!deactivateTarget) return;
        setDeactivateLoading(true);
        try {
            await deactivateMutation.mutateAsync(deactivateTarget.id);
            toast.success(t('dashboard.etudiants.toast_deactivated'));
            setDeactivateTarget(null);
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.toast_deactivate_error'));
        } finally {
            setDeactivateLoading(false);
        }
    };

    const handleReactivateStudent = async (student: StudentRow) => {
        try {
            await reactivateMutation.mutateAsync(student.id);
            toast.success(t('dashboard.etudiants.toast_reactivated'));
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.toast_reactivate_error'));
        }
    };

    const handleAnonymizeStudent = (student: StudentRow) => setAnonymizeTarget(student);

    const handleConfirmAnonymize = async () => {
        if (!anonymizeTarget) return;
        setAnonymizing(true);
        try {
            await anonymizeMutation.mutateAsync(anonymizeTarget.id);
            toast.success(t('dashboard.etudiants.toast_anonymized'));
            setAnonymizeTarget(null);
            onAnonymizeSuccess?.();
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.toast_anonymize_error'));
        } finally {
            setAnonymizing(false);
        }
    };

    return {
        // Props prêtes à passer directement à <StudentDetailModal>
        studentDetailProps: {
            onNotify: (s: StudentRow) => setNotifyingStudent(s),
            onToggleActive: (s: StudentRow) => (s.accountActive ? handleDeactivateStudent(s) : handleReactivateStudent(s)),
            onDeclareContract: (s: StudentRow) => setDeclaringContractFor(s),
            onAnonymize: isAdmin ? handleAnonymizeStudent : undefined,
            onViewCv: (s: StudentRow) => setViewingCvStudentId(s.id),        },

        notifyingStudent,
        closeNotify: () => setNotifyingStudent(null),
        handleNotifyStudent,

        declaringContractFor,
        closeDeclareContract: () => setDeclaringContractFor(null),

        deactivateTarget,
        deactivateLoading,
        closeDeactivateConfirm: () => setDeactivateTarget(null),
        handleConfirmDeactivate,

        anonymizeTarget,
        anonymizing,
        closeAnonymize: () => setAnonymizeTarget(null),
        handleConfirmAnonymize,

        viewingCvStudentId,
        setViewingCvStudentId,
        studentCv,
        studentCvLoading,
        cvStatuts,
    };
}

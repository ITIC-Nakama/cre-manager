import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMyJobApplications, useApplyToJobOffer, useWithdrawJobApplication } from './useJobOffers';

/** Logique d'application/retrait d'offre partagée entre IticOffresTab et ExternalOffresTab. */
export function useJobOfferApplyActions() {
    const { t } = useTranslation();
    const { data: myApplications } = useMyJobApplications();
    const applyMutation = useApplyToJobOffer();
    const withdrawMutation = useWithdrawJobApplication();
    const [withdrawTarget, setWithdrawTarget] = useState<{ applicationId: string; title: string } | null>(null);

    const appliedApplicationByOfferId = useMemo(() => {
        const map = new Map<string, string>();
        (myApplications?.content ?? []).forEach((a) => map.set(a.jobOfferId, a.id));
        return map;
    }, [myApplications]);

    const handleApply = async (offerId: string) => {
        try {
            await applyMutation.mutateAsync(offerId);
            toast.success(t('dashboard.offres.toast.applied'));
        } catch (err: any) {
            if (err?.response?.status === 409) {
                toast.error(t('dashboard.offres.toast.already_applied'));
            } else {
                toast.error(t('dashboard.offres.toast.apply_error'));
            }
        }
    };

    const handleWithdrawConfirm = async () => {
        if (!withdrawTarget) return;
        try {
            await withdrawMutation.mutateAsync(withdrawTarget.applicationId);
            toast.success(t('dashboard.offres.toast.withdrawn'));
            setWithdrawTarget(null);
        } catch {
            toast.error(t('dashboard.offres.toast.withdraw_error'));
        }
    };

    return {
        appliedApplicationByOfferId,
        applyMutation,
        withdrawMutation,
        withdrawTarget,
        setWithdrawTarget,
        handleApply,
        handleWithdrawConfirm,
    };
}

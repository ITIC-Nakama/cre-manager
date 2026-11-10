import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMyJobApplications, useApplyToJobOffer, useWithdrawJobApplication } from './useJobOffers';
import { useUserStore } from '../store/UserStore';
import { buildApplicationSubject, buildMailtoHref, getApplyChannel } from '../utils/applyChannel';
import type { JobOffer } from '../types/models/JobOffer';

/** Candidature par e-mail en cours : adresse et objet à proposer (copie si mailto ne s'ouvre pas). */
export interface EmailApplyTarget {
    offerId: string;
    title: string;
    email: string;
    subject: string;
    mailtoHref: string;
}

/** Offre pour laquelle on demande, au retour sur la page, si la candidature a été envoyée. */
export interface ApplyFollowUp {
    offerId: string;
    title: string;
}

function openMailto(href: string) {
    const link = document.createElement('a');
    link.href = href;
    link.click();
}

/** Logique d'application/retrait d'offre partagée entre IticOffresTab et ExternalOffresTab. */
export function useJobOfferApplyActions() {
    const { t } = useTranslation();
    const user = useUserStore((state) => state.user);
    const { data: myApplications } = useMyJobApplications();
    const applyMutation = useApplyToJobOffer();
    const withdrawMutation = useWithdrawJobApplication();
    const [withdrawTarget, setWithdrawTarget] = useState<{ applicationId: string; title: string } | null>(null);
    const [emailApply, setEmailApply] = useState<EmailApplyTarget | null>(null);
    const [followUp, setFollowUp] = useState<ApplyFollowUp | null>(null);

    const appliedApplicationByOfferId = useMemo(() => {
        const map = new Map<string, string>();
        (myApplications?.content ?? []).forEach((a) => map.set(a.jobOfferId, a.id));
        return map;
    }, [myApplications]);

    // Lien ouvert dans un nouvel onglet : on attend que l'étudiant quitte puis retrouve la page.
    const pendingLinkRef = useRef<ApplyFollowUp | null>(null);
    const leftPageRef = useRef(false);
    const appliedRef = useRef(appliedApplicationByOfferId);
    useEffect(() => {
        appliedRef.current = appliedApplicationByOfferId;
    }, [appliedApplicationByOfferId]);

    useEffect(() => {
        const handleLeave = () => {
            if (pendingLinkRef.current) leftPageRef.current = true;
        };
        const handleReturn = () => {
            if (document.visibilityState === 'hidden') {
                handleLeave();
                return;
            }
            const pending = pendingLinkRef.current;
            if (!pending || !leftPageRef.current) return;
            pendingLinkRef.current = null;
            leftPageRef.current = false;
            if (!appliedRef.current.has(pending.offerId)) setFollowUp(pending);
        };
        window.addEventListener('blur', handleLeave);
        window.addEventListener('focus', handleReturn);
        document.addEventListener('visibilitychange', handleReturn);
        return () => {
            window.removeEventListener('blur', handleLeave);
            window.removeEventListener('focus', handleReturn);
            document.removeEventListener('visibilitychange', handleReturn);
        };
    }, []);

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

    /**
     * Bouton « Postuler » : ouvre le lien de l'offre (nouvel onglet), sinon prépare un e-mail
     * (mailto + fenêtre avec l'adresse à copier), sinon affiche le détail de l'offre.
     */
    const handlePostuler = (offer: JobOffer, openDetail: (offer: JobOffer) => void) => {
        const channel = getApplyChannel(offer);
        if (channel === 'link' && offer.externalLink) {
            pendingLinkRef.current = { offerId: offer.id, title: offer.title };
            leftPageRef.current = false;
            window.open(offer.externalLink.trim(), '_blank', 'noopener,noreferrer');
            return;
        }
        if (channel === 'email' && offer.emailCandidature) {
            const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
            const subject = buildApplicationSubject(offer, fullName);
            const mailtoHref = buildMailtoHref(offer.emailCandidature, subject);
            setEmailApply({ offerId: offer.id, title: offer.title, email: offer.emailCandidature, subject, mailtoHref });
            openMailto(mailtoHref);
            return;
        }
        openDetail(offer);
    };

    /** Fermer la fenêtre e-mail = revenir sur la page : on demande si la candidature est partie. */
    const closeEmailApply = () => {
        if (emailApply && !appliedApplicationByOfferId.has(emailApply.offerId)) {
            setFollowUp({ offerId: emailApply.offerId, title: emailApply.title });
        }
        setEmailApply(null);
    };

    const confirmFollowUp = async () => {
        if (!followUp) return;
        await handleApply(followUp.offerId);
        setFollowUp(null);
    };

    const dismissFollowUp = () => setFollowUp(null);

    const handleWithdrawConfirm = async () => {
        if (!withdrawTarget) return;
        try {
            const result = await withdrawMutation.mutateAsync(withdrawTarget.applicationId);
            if (result.xpRevoked > 0) {
                toast.success(t('dashboard.offres.toast.withdrawn_xp_revoked', { xp: result.xpRevoked }));
            } else {
                toast.success(t('dashboard.offres.toast.withdrawn'));
            }
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
        handlePostuler,
        emailApply,
        closeEmailApply,
        followUp,
        confirmFollowUp,
        dismissFollowUp,
    };
}

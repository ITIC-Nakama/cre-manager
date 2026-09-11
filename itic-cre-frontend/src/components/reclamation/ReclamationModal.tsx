import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Loader2, MessageCircleWarning, Trash2, UserRoundX, X, XCircle } from 'lucide-react';
import { useCreateReclamation, useDeleteReclamation, useMyReclamationsInfinite, useReclamationFormContext } from '../../hooks/useReclamations';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useModalClose } from '../../hooks/useModalClose';
import InfiniteScrollSentinel from '../shared/InfiniteScrollSentinel';
import type { ReclamationStatus } from '../../types/models/Reclamation';

interface Props {
    onClose: () => void;
}

type Tab = 'new' | 'history';

const STATUS_STYLES: Record<ReclamationStatus, string> = {
    PENDING: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    RESOLVED: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    REFUSED: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
};

export default function ReclamationModal({ onClose }: Props) {
    const { t, i18n } = useTranslation();
    const [tab, setTab] = useState<Tab>('new');
    const [message, setMessage] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    useLockBodyScroll(scrollRef, true);
    const { isClosing, handleClose } = useModalClose(onClose);

    const { data: formContext, isLoading: formContextLoading } = useReclamationFormContext();
    const needsPhone = !formContext?.phoneNumber;
    const createMutation = useCreateReclamation();
    const deleteMutation = useDeleteReclamation();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const {
        items: history, isLoading: historyLoading, hasNextPage, isFetchingNextPage, fetchNextPage,
    } = useMyReclamationsInfinite({ size: 10 });

    const handleWithdraw = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteMutation.mutateAsync(id);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || t('dashboard.reclamations.history.withdraw_error', "Impossible de retirer ce signalement, réessayez."));
        } finally {
            setDeletingId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (message.trim().length < 5) {
            setError(t('dashboard.reclamations.form.message_too_short', 'Décrivez un peu plus votre problème.'));
            return;
        }
        if (needsPhone && phoneNumber.trim().length < 7) {
            setError(t('dashboard.reclamations.form.phone_required', 'Merci de renseigner votre numéro de téléphone.'));
            return;
        }

        try {
            await createMutation.mutateAsync({
                message: message.trim(),
                phoneNumber: needsPhone ? phoneNumber.trim() : undefined,
            });
            toast.success(t('dashboard.reclamations.form.success', 'Votre conseiller a été prévenu, il vous recontactera bientôt.'));
            setMessage('');
            setPhoneNumber('');
            setTab('history');
        } catch (err: any) {
            setError(err?.response?.data?.message || t('dashboard.reclamations.form.error', "Une erreur est survenue, réessayez."));
        }
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return createPortal(
        <div
            className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
            onClick={handleClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden ${isClosing ? 'animate-scale-down' : 'animate-scale-up'}`}
            >
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-start gap-2">
                        <MessageCircleWarning className="h-4 w-4 text-indigo-500 shrink-0 mt-1" />
                        <p className="text-base font-bold text-slate-900 dark:text-white">
                            {t('dashboard.reclamations.title', 'Un problème ? Contactez votre conseiller')}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex items-center gap-5 px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    {(['new', 'history'] as Tab[]).map((tabKey) => (
                        <button
                            key={tabKey}
                            type="button"
                            onClick={() => setTab(tabKey)}
                            className={`pb-2.5 -mb-px border-b-2 text-sm font-semibold transition-colors cursor-pointer ${
                                tab === tabKey
                                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {tabKey === 'new'
                                ? t('dashboard.reclamations.tab_new', 'Nouveau signalement')
                                : t('dashboard.reclamations.tab_history', 'Mes signalements')}
                        </button>
                    ))}
                </div>

                <div ref={scrollRef} className="p-5 overflow-y-auto overscroll-contain flex-1 min-w-0">
                <div key={tab} className="animate-fade-in-up">
                    {tab === 'new' && formContextLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                        </div>
                    ) : tab === 'new' && !formContext?.hasAdvisor ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                            <UserRoundX className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {t('dashboard.reclamations.form.no_advisor_title', "Pas encore de conseiller")}
                            </p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
                                {t('dashboard.reclamations.form.no_advisor_description', "Vous n'avez pas encore de conseiller assigné. Merci de patienter, un conseiller vous sera bientôt attribué.")}
                            </p>
                        </div>
                    ) : tab === 'new' ? (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t('dashboard.reclamations.form.subtitle', 'Expliquez votre problème, votre conseiller sera prévenu et vous recontactera directement.')}
                            </p>

                            {error && (
                                <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-xl px-3 py-2">
                                    {error}
                                </p>
                            )}

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {t('dashboard.reclamations.form.message_label', 'Votre message')} <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={5}
                                    maxLength={2000}
                                    placeholder={t('dashboard.reclamations.form.message_placeholder', 'Décrivez ce qui ne va pas...')}
                                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>

                            {needsPhone && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        {t('dashboard.reclamations.form.phone_label', 'Votre numéro de téléphone')} <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="06 12 34 56 78"
                                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                        {t('dashboard.reclamations.form.phone_hint', 'Pour que votre conseiller puisse vous rappeler.')}
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="mt-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('dashboard.reclamations.form.submit', 'Envoyer')}
                            </button>
                        </form>
                    ) : historyLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                            <MessageCircleWarning className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-sm text-slate-400 dark:text-slate-500">
                                {t('dashboard.reclamations.history.empty', "Vous n'avez fait aucun signalement.")}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {history.map((r) => (
                                <div
                                    key={r.id}
                                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col gap-2"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[r.status]}`}>
                                            {r.status === 'RESOLVED' && <CheckCircle2 className="h-3 w-3" />}
                                            {r.status === 'REFUSED' && <XCircle className="h-3 w-3" />}
                                            {r.status === 'PENDING' && <Clock className="h-3 w-3" />}
                                            {r.status === 'RESOLVED' && t('dashboard.reclamations.history.status_resolved', 'Résolu')}
                                            {r.status === 'REFUSED' && t('dashboard.reclamations.history.status_refused', 'Refusé')}
                                            {r.status === 'PENDING' && t('dashboard.reclamations.history.status_pending', 'En attente')}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatDate(r.dateCreation)}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleWithdraw(r.id)}
                                                disabled={deletingId === r.id}
                                                title={t('dashboard.reclamations.history.withdraw', 'Retirer')}
                                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{r.message}</p>
                                </div>
                            ))}
                            <InfiniteScrollSentinel
                                hasMore={!!hasNextPage}
                                isLoadingMore={isFetchingNextPage}
                                onLoadMore={fetchNextPage}
                            />
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

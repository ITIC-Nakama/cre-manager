import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useModalLayer } from '../../hooks/useModalLayer';
import NotifyStudentModal from '../shared/NotifyStudentModal';
import { fetchSuggestedCandidates } from '../../api-s/requests/MatchingRequest';
import type { SuggestedCandidate } from '../../api-s/requests/MatchingRequest';
import { notifyStudent } from '../../api-s/requests/DashboardRequest';
import type { JobOffer } from '../../types/models/JobOffer';
import { reasonTexts } from './matchReasons';

/** « Candidats suggérés » pour une offre (équipe, vouvoiement) : 20 étudiants au plus, score et raisons, envoi par la messagerie. */
export default function SuggestedCandidatesModal({ offer, onClose }: { offer: JobOffer; onClose: () => void }) {
    const { t } = useTranslation();
    useModalLayer();
    const [sendTo, setSendTo] = useState<SuggestedCandidate | null>(null);
    const { data, isLoading } = useQuery({
        queryKey: ['jobboard', 'suggested-candidates', offer.id],
        queryFn: () => fetchSuggestedCandidates(offer.id),
    });
    const link = `${window.location.origin}/student/offres?offre=${offer.id}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 animate-fadeIn" role="dialog" aria-modal="true"
            aria-label={t('matching.suggested_title', 'Candidats suggérés')}>
            <div className="bg-white dark:bg-slate-900 w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col">
                <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                            <Sparkles className="h-5 w-5 text-[#3f74ff]" /> {t('matching.suggested_title', 'Candidats suggérés')}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{offer.title} · {offer.company}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label={t('matching.close', 'Fermer')}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-5 w-5" /></button>
                </div>
                <div className="overflow-y-auto p-5">
                    {isLoading || !data ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                    ) : data.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-10">
                            {t('matching.suggested_none', 'Aucun étudiant sans contrat ne correspond à cette offre (formation, mots-clés).')}
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {data.map((c) => (
                                <li key={c.studentId} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#3f74ff]/10 text-[#3f74ff] text-sm font-bold"
                                        title={t('matching.score_title', 'Score de rapprochement')}>{c.score}</span>
                                    <div className="flex-1 min-w-0">
                                        <Link to={`/supervisor/etudiants/${c.studentId}`} className="font-semibold text-slate-900 dark:text-white hover:text-[#3f74ff]">
                                            {c.firstName} {c.lastName}
                                        </Link>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {c.formation} · {c.promotion}{c.department ? ` · ${t('matching.department', 'dép. {{code}}', { code: c.department })}` : ''}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                            <span className="font-semibold">{t('matching.why', 'Pourquoi :')}</span> {reasonTexts(c.reasons, 'staff', t).join(' · ')}
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => setSendTo(c)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#3f74ff] text-white text-sm font-semibold hover:bg-[#2f63ee] cursor-pointer shrink-0">
                                        <Send className="h-4 w-4" /> {t('matching.send_offer', 'Envoyer l’offre')}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            {sendTo && (
                <NotifyStudentModal
                    student={{ id: sendTo.studentId, firstName: sendTo.firstName, lastName: sendTo.lastName, email: '' }}
                    initialMessage={t('matching.send_message', 'Bonjour {{firstName}}, cette offre pourrait t’intéresser : « {{title}} » chez {{company}}. Tu peux la consulter ici : {{link}}', {
                        firstName: sendTo.firstName, title: offer.title, company: offer.company, link,
                    })}
                    onClose={() => setSendTo(null)}
                    onSend={async (message) => {
                        await notifyStudent(sendTo.studentId, message);
                        toast.success(t('matching.sent', 'Message envoyé dans la conversation de l’étudiant.'));
                        setSendTo(null);
                    }}
                />
            )}
        </div>
    );
}

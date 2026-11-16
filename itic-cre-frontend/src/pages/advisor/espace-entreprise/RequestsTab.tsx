import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Mail, Phone, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { fetchCompanyRequests, setCompanyRequestHandled } from '../../../api-s/requests/CompanySpaceRequest';
import { NEW_REQUESTS_KEY } from './useNewCompanyRequestCount';

type Filter = 'NEW' | 'HANDLED' | 'ALL';

/** Demandes des entreprises : nouvelles / traitées. */
export default function RequestsTab() {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<Filter>('NEW');
    const [page, setPage] = useState(0);
    const { data, isLoading } = useQuery({
        queryKey: ['company-space', 'requests', filter, page],
        queryFn: () => fetchCompanyRequests(filter, page),
    });
    const handle = useMutation({
        mutationFn: ({ id, handled }: { id: string; handled: boolean }) => setCompanyRequestHandled(id, handled),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-space', 'requests'] });
            queryClient.invalidateQueries({ queryKey: NEW_REQUESTS_KEY });
        },
        onError: () => toast.error(t('company_admin.save_error', 'La modification n’a pas pu être enregistrée.')),
    });
    const date = (iso: string) => new Date(iso).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });

    const filters: { key: Filter; label: string }[] = [
        { key: 'NEW', label: t('company_admin.requests.new', 'Nouvelles') },
        { key: 'HANDLED', label: t('company_admin.requests.handled', 'Traitées') },
        { key: 'ALL', label: t('company_admin.requests.all', 'Toutes') },
    ];

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                {filters.map((f) => (
                    <button key={f.key} type="button" onClick={() => { setFilter(f.key); setPage(0); }}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border cursor-pointer ${filter === f.key
                            ? 'bg-[#3f74ff] border-[#3f74ff] text-white'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {f.label}{f.key === 'NEW' && data ? ` · ${data.newCount}` : ''}
                    </button>
                ))}
            </div>
            {isLoading || !data ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : data.content.length === 0 ? (
                <p className="text-sm text-slate-500 py-10 text-center">{t('company_admin.requests.empty', 'Aucune demande.')}</p>
            ) : (
                <ul className="space-y-3">
                    {data.content.map((r) => (
                        <li key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        {r.company}
                                        <span className={`ml-2 text-[11px] font-semibold rounded-full px-2 py-0.5 ${r.status === 'NEW'
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                                            {r.status === 'NEW' ? t('company_admin.requests.badge_new', 'Nouvelle') : t('company_admin.requests.badge_handled', 'Traitée')}
                                        </span>
                                    </p>
                                    <p className="text-xs text-slate-400">{date(r.createdAt)}{r.programName ? ` · ${r.programName}` : ''}</p>
                                </div>
                                {r.status === 'NEW' ? (
                                    <button type="button" onClick={() => handle.mutate({ id: r.id, handled: true })}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 cursor-pointer">
                                        <CheckCircle2 className="h-4 w-4" /> {t('company_admin.requests.mark_handled', 'Marquer comme traitée')}
                                    </button>
                                ) : (
                                    <button type="button" onClick={() => handle.mutate({ id: r.id, handled: false })}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                                        <RotateCcw className="h-4 w-4" /> {t('company_admin.requests.reopen', 'Remettre en nouvelle')}
                                    </button>
                                )}
                            </div>
                            {r.studentName && (
                                <p className="text-sm text-slate-700 dark:text-slate-200">
                                    {t('company_admin.requests.about', 'Profil :')}{' '}
                                    {r.studentId
                                        ? <Link to={`/supervisor/etudiants/${r.studentId}`} className="font-semibold text-[#3f74ff] hover:underline">{r.studentName}</Link>
                                        : <span className="font-semibold">{r.studentName}</span>}
                                </p>
                            )}
                            <p className="text-sm text-slate-600 dark:text-[#9aa0a6] whitespace-pre-wrap">{r.message}</p>
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">{r.contactName}</span>
                                <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 text-[#3f74ff] hover:underline"><Mail className="h-4 w-4" />{r.email}</a>
                                {r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><Phone className="h-4 w-4" />{r.phone}</a>}
                            </div>
                            {r.handledBy && r.handledAt && (
                                <p className="text-xs text-slate-400">{t('company_admin.requests.handled_by', 'Traitée par {{name}} le {{date}}', { name: r.handledBy, date: date(r.handledAt) })}</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {data && data.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 cursor-pointer">←</button>
                    <span className="px-2 py-1.5 text-sm text-slate-500">{page + 1} / {data.totalPages}</span>
                    <button type="button" disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 cursor-pointer">→</button>
                </div>
            )}
            <p className="text-xs text-slate-400">{t('company_admin.requests.retention', 'Les coordonnées des entreprises sont supprimées un an après leur demande.')}</p>
        </div>
    );
}

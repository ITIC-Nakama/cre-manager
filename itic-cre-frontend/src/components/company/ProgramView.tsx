import { useState } from 'react';
import { AlertTriangle, CalendarClock, Eye, GraduationCap, HeartHandshake, Repeat, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PdfViewerModal from '../shared/PdfViewerModal';
import CompanyRequestModal from './CompanyRequestModal';
import { companyCvPath } from '../../api-s/requests/CompanySpaceRequest';
import type { CompanyCandidate, CompanyProgramPage } from '../../api-s/requests/CompanySpaceRequest';

const LEVEL_LABEL: Record<string, string> = { BTS: 'BTS', BACHELOR: 'Bachelor', MASTERE: 'Mastère' };

/**
 * Page d'une formation : introduction, avertissement, cartes des étudiants (prénom, nom, formation, promotion,
 * rythme, disponibilité, « Voir le CV », « Ce profil m'intéresse »). Sert aussi à l'aperçu du back-office.
 */
export default function ProgramView({ page, preview = false }: { page: CompanyProgramPage; preview?: boolean }) {
    const { t } = useTranslation();
    const [viewing, setViewing] = useState<CompanyCandidate | null>(null);
    const [interested, setInterested] = useState<CompanyCandidate | null>(null);

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#3f74ff]">
                    {LEVEL_LABEL[page.level] ?? page.level} · {page.domain}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{page.displayName}</h1>
                <p className="text-slate-600 dark:text-[#9aa0a6]">{page.intro}</p>
                {page.texts.warningText && (
                    <p className="flex items-start gap-2 text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl px-4 py-3">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{page.texts.warningText.replace(/^⚠️\s*/, '')}</span>
                    </p>
                )}
            </div>

            {page.candidates.length === 0 ? (
                <div className="flex flex-col items-center text-center gap-2 py-12 px-4 bg-white dark:bg-[#15171f] rounded-2xl border border-slate-200 dark:border-slate-800">
                    <Users className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{t('company.program.empty_title', 'Aucun CV disponible pour le moment')}</p>
                    <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                        {t('company.program.empty_text', 'Contactez-nous : l’équipe du Pôle Entreprises vous présentera les profils disponibles.')}
                    </p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                        {t('company.program.count', '{{count}} CV disponible(s)', { count: page.candidates.length })}
                    </p>
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {page.candidates.map((c) => (
                            <li key={c.id} className="flex flex-col bg-white dark:bg-[#15171f] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                                <div className="flex items-center gap-3">
                                    <span className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-[#3f74ff] to-[#6d5efc] text-white font-bold flex items-center justify-center">
                                        {(c.firstName[0] ?? '').toUpperCase()}{(c.lastName[0] ?? '').toUpperCase()}
                                    </span>
                                    <p className="font-bold text-slate-900 dark:text-white leading-tight">{c.firstName} {c.lastName}</p>
                                </div>
                                <dl className="mt-4 space-y-2 text-sm flex-1">
                                    <Info icon={<GraduationCap className="h-4 w-4" />} label={t('company.card.formation', 'Formation')} value={c.formation} />
                                    <Info icon={<Users className="h-4 w-4" />} label={t('company.card.promotion', 'Promotion')} value={c.promotion} />
                                    <Info icon={<Repeat className="h-4 w-4" />} label={t('company.card.rhythm', 'Rythme')} value={c.rhythm} />
                                    <Info icon={<CalendarClock className="h-4 w-4" />} label={t('company.card.availability', 'Disponibilité')} value={c.availability} />
                                </dl>
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setViewing(c)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#3f74ff] text-white text-sm font-semibold hover:bg-[#2f63ee] cursor-pointer">
                                        <Eye className="h-4 w-4" /> {t('company.card.view_cv', 'Voir le CV')}
                                    </button>
                                    <button type="button" onClick={() => setInterested(c)} disabled={preview}
                                        title={preview ? t('company.card.preview_disabled', 'Désactivé dans l’aperçu') : undefined}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                                        <HeartHandshake className="h-4 w-4" /> {t('company.card.interested', 'Ce profil m’intéresse')}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <PdfViewerModal isOpen={!!viewing} url={viewing ? companyCvPath(viewing.cvToken) : ''}
                fileName={viewing ? `CV-${viewing.firstName}-${viewing.lastName}.pdf` : 'cv.pdf'}
                title={viewing ? `${viewing.firstName} ${viewing.lastName} · ${viewing.formation}` : undefined}
                onClose={() => setViewing(null)} />
            {interested && <CompanyRequestModal candidate={interested} slug={page.slug} onClose={() => setInterested(null)} />}
        </div>
    );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-2">
            <span className="text-slate-400 mt-0.5">{icon}</span>
            <div className="min-w-0">
                <dt className="text-xs text-slate-400 dark:text-slate-500">{label}</dt>
                <dd className="text-slate-700 dark:text-slate-200 font-medium">{value}</dd>
            </div>
        </div>
    );
}

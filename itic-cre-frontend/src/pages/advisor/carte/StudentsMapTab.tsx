import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Handshake, Loader2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fieldClass } from '../../../components/basics/fieldStyles';
import { usePromotions } from '../../../hooks/usePromotions';
import { fetchAdminPrograms } from '../../../api-s/requests/CompanySpaceRequest';
import { fetchDepartmentStudents, fetchStudentMap } from '../../../api-s/requests/StudentLocationRequest';
import type { ContractFilter, MapFilters } from '../../../api-s/requests/StudentLocationRequest';
import IdfMap from './IdfMap';

/** Onglet « Étudiants » de /supervisor/carte : étudiants actifs par département (Île-de-France en carte, autres en liste). */
export default function StudentsMapTab() {
    const { t } = useTranslation();
    const [filters, setFilters] = useState<MapFilters>({ contract: 'ALL' });
    const [selected, setSelected] = useState<string | null>(null);
    const { data: promotions } = usePromotions();
    const { data: programs } = useQuery({ queryKey: ['company-space', 'programs'], queryFn: fetchAdminPrograms, staleTime: 5 * 60_000 });
    const { data: map, isLoading } = useQuery({ queryKey: ['students-map', filters], queryFn: () => fetchStudentMap(filters) });
    const { data: students, isFetching: loadingStudents } = useQuery({
        queryKey: ['students-map', 'department', selected, filters],
        queryFn: () => fetchDepartmentStudents(selected as string, filters),
        enabled: !!selected,
    });

    const counts = Object.fromEntries((map?.departments ?? []).map((d) => [d.code, d.count]));
    const others = (map?.departments ?? []).filter((d) => !d.ileDeFrance);
    const idf = (map?.departments ?? []).filter((d) => d.ileDeFrance);
    const idfTotal = idf.reduce((s, d) => s + d.count, 0);
    const selectedName = map?.departments.find((d) => d.code === selected)?.name;
    const label = (code: string, name: string, count: number) =>
        t('carte.department_label', '{{name}} ({{code}}) : {{count}} étudiant(s)', { name, code, count });

    return (
        <div className="space-y-6">
            <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                {t('carte.subtitle', 'Étudiants actifs par département, d’après le code postal de leur profil. Seul le département est affiché.')}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
                <select className={fieldClass(false, false)} aria-label={t('carte.filter_program', 'Formation')}
                    value={filters.programId ?? ''} onChange={(e) => { setFilters({ ...filters, programId: e.target.value || undefined }); }}>
                    <option value="">{t('carte.all_programs', 'Toutes les formations')}</option>
                    {(programs ?? []).map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                </select>
                <select className={fieldClass(false, false)} aria-label={t('carte.filter_promotion', 'Promotion')}
                    value={filters.promotionId ?? ''} onChange={(e) => { setFilters({ ...filters, promotionId: e.target.value || undefined }); }}>
                    <option value="">{t('carte.all_promotions', 'Toutes les promotions')}</option>
                    {(promotions ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className={fieldClass(false, false)} aria-label={t('carte.filter_contract', 'Contrat')}
                    value={filters.contract} onChange={(e) => setFilters({ ...filters, contract: e.target.value as ContractFilter })}>
                    <option value="ALL">{t('carte.contract_all', 'Avec ou sans contrat')}</option>
                    <option value="WITHOUT">{t('carte.contract_without', 'Sans contrat')}</option>
                    <option value="WITH">{t('carte.contract_with', 'Avec contrat')}</option>
                </select>
            </div>

            {isLoading || !map ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : (
                <>
                    <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                        {t('carte.summary', '{{located}} étudiant(s) localisé(s), dont {{idf}} en Île-de-France · {{missing}} sans code postal', {
                            located: map.located, idf: idfTotal, missing: map.withoutPostalCode,
                        })}
                    </p>
                    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t('carte.idf', 'Île-de-France')}</h2>
                            <IdfMap counts={counts} selected={selected} onSelect={setSelected} label={label} />
                            <p className="mt-3 text-[11px] text-slate-400">
                                {t('carte.source', 'Contours : IGN – Admin Express, via france-geojson (Licence ouverte).')}
                            </p>
                        </section>
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t('carte.others', 'Autres départements')}</h2>
                            {others.length === 0 ? (
                                <p className="text-sm text-slate-400">{t('carte.others_none', 'Aucun étudiant hors Île-de-France.')}</p>
                            ) : (
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                                    {others.map((d) => (
                                        <li key={d.code}>
                                            <button type="button" onClick={() => setSelected(d.code)} aria-pressed={selected === d.code}
                                                className={`w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg text-left text-sm cursor-pointer ${selected === d.code
                                                    ? 'bg-[#3f74ff]/10 text-[#3f74ff]' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
                                                <span><span className="font-mono text-xs text-slate-400 mr-2">{d.code}</span>{d.name}</span>
                                                <span className="font-semibold tabular-nums">{d.count}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                </>
            )}

            {selected && (
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <h2 className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                        <MapPin className="h-4 w-4 text-[#3f74ff]" /> {selectedName ?? selected} ({selected})
                        {students && <span className="font-normal text-slate-400">· {t('carte.students_count', '{{count}} étudiant(s)', { count: students.length })}</span>}
                    </h2>
                    {loadingStudents && !students ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                    ) : !students || students.length === 0 ? (
                        <p className="px-5 py-8 text-sm text-slate-400 text-center">{t('carte.students_none', 'Aucun étudiant avec ces filtres.')}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs uppercase text-slate-400 text-left">
                                    <tr>
                                        <th className="px-5 py-2 font-semibold">{t('carte.col_name', 'Nom')}</th>
                                        <th className="px-3 py-2 font-semibold">{t('carte.col_program', 'Formation')}</th>
                                        <th className="px-3 py-2 font-semibold">{t('carte.col_promotion', 'Promotion')}</th>
                                        <th className="px-5 py-2 font-semibold">{t('carte.col_contract', 'Contrat')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {students.map((s) => (
                                        <tr key={s.id}>
                                            <td className="px-5 py-2.5">
                                                <Link to={`/supervisor/etudiants/${s.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-[#3f74ff]">
                                                    {s.lastName} {s.firstName}
                                                </Link>
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{s.formation ?? '—'}</td>
                                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{s.promotion ?? '—'}</td>
                                            <td className="px-5 py-2.5">
                                                {s.underContract
                                                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-2 py-0.5"><Handshake className="h-3 w-3" />{t('carte.contract_yes', 'Oui')}</span>
                                                    : <span className="text-xs text-slate-400">{t('carte.contract_no', 'Non')}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

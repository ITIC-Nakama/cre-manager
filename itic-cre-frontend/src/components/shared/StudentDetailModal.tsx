import { useState, useMemo } from 'react';
import { X, Star, FileText, AlertCircle, Calendar, GraduationCap, ShieldCheck, ShieldAlert, Mail, UserX, UserCheck, Pencil, Check, Loader2, Handshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { StudentRow } from '../../types/models/Dashboard';
import { isAnonymizedStudent } from '../../utils/studentUtils';
import { usePromotions, useAssignStudentToPromotion, useRemoveStudentFromPromotion } from '../../hooks/usePromotions';
import { formatPromotionLabel } from '../../utils/promotionUtils';
import CustomSelect from '../basics/CustomSelect';

interface Props {
    student: StudentRow;
    onClose: () => void;
    onNotify?: (student: StudentRow) => void;
    onToggleActive?: (student: StudentRow) => void;
}

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function StudentDetailModal({ student, onClose, onNotify, onToggleActive }: Props) {
    const { t } = useTranslation();
    const { data: promotions } = usePromotions();
    const assignMutation = useAssignStudentToPromotion();
    const removeMutation = useRemoveStudentFromPromotion();

    const [isEditingPromo, setIsEditingPromo] = useState(false);
    const [selectedPromoId, setSelectedPromoId] = useState(student.promotion?.id ?? '');
    const [selectedStudyYear, setSelectedStudyYear] = useState<number | null>(student.studyYear ?? null);
    const [savingPromo, setSavingPromo] = useState(false);

    const [localPromotion, setLocalPromotion] = useState<{ id: string; nom: string } | null | undefined>(student.promotion);
    const [localStudyYear, setLocalStudyYear] = useState<number | null | undefined>(student.studyYear);

    const selectedPromotion = useMemo(() => {
        return promotions?.find((p) => p.id === selectedPromoId);
    }, [promotions, selectedPromoId]);

    const promoOptions = useMemo(() => {
        return [
            { value: '', label: t('dashboard.etudiants.detail.no_promotion', '— Aucune promotion —') },
            ...(promotions ?? []).map((p) => ({
                value: p.id,
                label: formatPromotionLabel(p),
            })),
        ];
    }, [promotions, t]);

    const studyYearOptions = useMemo(() => {
        if (!selectedPromotion?.hasYears || !selectedPromotion.availableYears?.length) return [];
        return selectedPromotion.availableYears.map((yr) => ({
            value: String(yr),
            label: t(`study_years.year_${yr}`, `${yr}e année`),
        }));
    }, [selectedPromotion, t]);

    const handleSavePromotion = async () => {
        setSavingPromo(true);
        try {
            if (!selectedPromoId) {
                if (student.promotion?.id) {
                    await removeMutation.mutateAsync({ promotionId: student.promotion.id, studentId: student.id });
                }
                setLocalPromotion(null);
                setLocalStudyYear(null);
            } else {
                const effectiveYear = selectedPromotion?.hasYears ? (selectedStudyYear ?? undefined) : undefined;
                await assignMutation.mutateAsync({
                    promotionId: selectedPromoId,
                    studentId: student.id,
                    studyYear: effectiveYear,
                });
                setLocalPromotion({ id: selectedPromoId, nom: selectedPromotion?.name ?? '' });
                setLocalStudyYear(effectiveYear ?? null);
            }
            setIsEditingPromo(false);
            toast.success(t('dashboard.etudiants.detail.toast_promo_updated', 'Affectation mise à jour avec succès !'));
        } catch (err) {
            console.error(err);
            toast.error(t('dashboard.etudiants.detail.toast_promo_update_error', 'Erreur lors de la mise à jour de la promotion.'));
        } finally {
            setSavingPromo(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 animate-fadeIn max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-lg font-bold text-indigo-600 dark:text-indigo-400">
                            {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                            <p className="text-base font-bold text-slate-900 dark:text-white">
                                {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Status badges row */}
                    <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            student.isActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                        }`}>
                            {student.isActive ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                            {student.isActive ? t('dashboard.etudiants.table.active') : t('dashboard.etudiants.table.inactive')}
                        </span>

                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            student.hasCv
                                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30'
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                        }`}>
                            <FileText className="h-3.5 w-3.5" />
                            {student.hasCv ? t('dashboard.etudiants.table.cv_deposited') : t('dashboard.etudiants.table.cv_none')}
                        </span>

                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            student.underContract
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                        }`}>
                            <Handshake className="h-3.5 w-3.5" />
                            {student.underContract
                                ? t('dashboard.etudiants.table.under_contract_badge', 'Sous contrat')
                                : t('dashboard.etudiants.detail.not_under_contract', 'Pas sous contrat')}
                        </span>

                        {student.contractNeedsVerification && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                {t('dashboard.etudiants.table.contract_unverified_badge', 'À vérifier')}
                            </span>
                        )}
                    </div>

                    {/* Basic Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Promotion & Year Card with Live Editor */}
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                    <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                                    {t('dashboard.etudiants.table.promotion')}
                                </p>
                                {!isEditingPromo && !isAnonymizedStudent(student) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedPromoId(localPromotion?.id ?? '');
                                            setSelectedStudyYear(localStudyYear ?? null);
                                            setIsEditingPromo(true);
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                        title={t('dashboard.etudiants.detail.edit_promotion', 'Modifier')}
                                    >
                                        <Pencil className="h-3 w-3" />
                                        <span>{t('common.edit', 'Modifier')}</span>
                                    </button>
                                )}
                            </div>

                            {isEditingPromo ? (
                                <div className="space-y-2.5 pt-1 animate-fadeIn">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                            {t('dashboard.promotions.label_name', 'Promotion')}
                                        </label>
                                        <CustomSelect
                                            value={selectedPromoId}
                                            options={promoOptions}
                                            disabled={savingPromo}
                                            searchable={promoOptions.length > 5}
                                            searchPlaceholder={t('dashboard.promotions.placeholder_add_student', 'Rechercher…')}
                                            onChange={(newId) => {
                                                setSelectedPromoId(newId);
                                                const p = promotions?.find((item) => item.id === newId);
                                                if (p?.hasYears && p.availableYears?.length) {
                                                    setSelectedStudyYear(p.availableYears[0]);
                                                } else {
                                                    setSelectedStudyYear(null);
                                                }
                                            }}
                                            className="w-full text-xs"
                                        />
                                    </div>

                                    {selectedPromotion?.hasYears && studyYearOptions.length > 0 ? (
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                                {t('dashboard.promotions.available_years_label', 'Année d\'étude')}
                                            </label>
                                            <CustomSelect
                                                value={selectedStudyYear ? String(selectedStudyYear) : ''}
                                                options={studyYearOptions}
                                                disabled={savingPromo}
                                                onChange={(val) => setSelectedStudyYear(val ? Number(val) : null)}
                                                className="w-full text-xs"
                                            />
                                        </div>
                                    ) : null}

                                    <div className="flex items-center justify-end gap-1.5 pt-1">
                                        <button
                                            type="button"
                                            disabled={savingPromo}
                                            onClick={() => setIsEditingPromo(false)}
                                            className="px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                        >
                                            {t('common.cancel', 'Annuler')}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={savingPromo}
                                            onClick={handleSavePromotion}
                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            {savingPromo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                            {t('common.save', 'Enregistrer')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                                    <span>{localPromotion?.nom || t('dashboard.etudiants.detail.no_promotion', 'Aucune')}</span>
                                    {localStudyYear && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                                            {t(`study_years.year_${localStudyYear}`, `${localStudyYear}e année`)}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>

                        {/* Grade & XP Card */}
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3">
                            <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 text-violet-400" />
                                {t('dashboard.etudiants.table.grade_xp').split(' / ')[0]}
                            </p>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                <span>{student.grade?.nom || '—'}</span>
                                <span className="text-xs text-slate-400 font-normal">({student.xpTotal} XP)</span>
                            </p>
                        </div>
                    </div>

                    {/* Applications stats card */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {t('dashboard.etudiants.table.applications')}
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-2xl font-bold text-slate-805 dark:text-white">
                                    {student.applicationCount}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {t('dashboard.etudiants.detail.total_applications')}
                                </p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {student.staleApplicationCount}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                    {student.staleApplicationCount > 0 && <AlertCircle className="h-3 w-3 text-amber-500" />}
                                    {t('dashboard.etudiants.detail.stale_applications')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Activity tracking */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{t('dashboard.etudiants.detail.last_activity', { date: formatDateTime(student.lastActivity) })}</span>
                    </div>

                    {/* Actions Footer */}
                    {(() => {
                        const isAnonymized = isAnonymizedStudent(student);
                        if (isAnonymized) {
                            return (
                                <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                                        <span>{t('dashboard.students.anonymized_account', 'Compte anonymisé RGPD (non réactivable)')}</span>
                                    </span>
                                </div>
                            );
                        }
                        if (!onNotify && !onToggleActive) return null;
                        return (
                            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                {onNotify && (
                                    <button
                                        type="button"
                                        onClick={() => { onClose(); onNotify(student); }}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                                    >
                                        <Mail className="h-3.5 w-3.5" />
                                        <span>{t('dashboard.etudiants.actions.notify')}</span>
                                    </button>
                                )}

                                {onToggleActive && (
                                    student.accountActive ? (
                                        <button
                                            type="button"
                                            onClick={() => { onClose(); onToggleActive(student); }}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                                        >
                                            <UserX className="h-3.5 w-3.5" />
                                            <span>{t('dashboard.etudiants.actions.deactivate')}</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => { onClose(); onToggleActive(student); }}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                                        >
                                            <UserCheck className="h-3.5 w-3.5" />
                                            <span>{t('dashboard.etudiants.actions.reactivate')}</span>
                                        </button>
                                    )
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}

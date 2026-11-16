import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import { usePrograms } from '../../hooks/usePrograms';
import type { AdminProgram } from '../../api-s/requests/CompanySpaceRequest';

const LEVELS: AdminProgram['level'][] = ['BTS', 'BACHELOR', 'MASTERE'];

/**
 * Formations ciblées d'une offre (lot 8) : « Toutes les formations » ou une sélection. Les étudiants de ces formations
 * reçoivent l'alerte instantanée à la publication.
 */
export default function FormationPicker({ value, all, onChange, disabled = false, error }: {
    value: string[];
    all: boolean;
    onChange: (ids: string[], all: boolean) => void;
    disabled?: boolean;
    error?: string;
}) {
    const { t } = useTranslation();
    const { data: programs } = usePrograms();
    const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id], false);
    const levelLabel = (l: AdminProgram['level']) =>
        l === 'BTS' ? 'BTS' : l === 'BACHELOR' ? t('formations.level_bachelor', 'Bachelor') : t('formations.level_mastere', 'Mastère');

    return (
        <fieldset className="space-y-2" aria-describedby={error ? 'formation-picker-error' : undefined}>
            <legend className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <GraduationCap className="h-3.5 w-3.5" />
                {t('formations.picker_label', 'Formations ciblées')} <span className="text-rose-500">*</span>
            </legend>
            <p className="text-xs text-slate-400">
                {t('formations.picker_hint', 'Les étudiants de ces formations, sans contrat, reçoivent une alerte par e-mail dès la publication.')}
            </p>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={all} disabled={disabled} onChange={(e) => onChange(value, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                {t('formations.picker_all', 'Toutes les formations')}
            </label>
            {!all && (
                <div className="space-y-2">
                    {LEVELS.map((level) => {
                        const list = (programs ?? []).filter((p) => p.level === level);
                        if (list.length === 0) return null;
                        return (
                            <div key={level}>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">{levelLabel(level)}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {list.map((p) => {
                                        const on = value.includes(p.id);
                                        return (
                                            <button key={p.id} type="button" disabled={disabled} aria-pressed={on} onClick={() => toggle(p.id)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer disabled:cursor-default ${on
                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'}`}>
                                                {p.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {error && <p id="formation-picker-error" className="text-xs text-rose-500">{error}</p>}
        </fieldset>
    );
}

import { useState } from 'react';
import { Check, Loader2, MapPin, Pencil, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { updateStudentPostalCode } from '../../api-s/requests/StudentLocationRequest';
import { getApiErrorMessage } from '../../utils/errorHelper';

/** Fiche étudiant (équipe) : code postal modifiable sur place ; vouvoiement. */
export default function StudentPostalCodeField({ studentId, postalCode, department, onSaved }: {
    studentId: string;
    postalCode?: string | null;
    department?: string | null;
    onSaved?: (postalCode: string | null, department: string | null) => void;
}) {
    const { t } = useTranslation();
    const [current, setCurrent] = useState({ postalCode: postalCode ?? null, department: department ?? null });
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(postalCode ?? '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const loc = await updateStudentPostalCode(studentId, value);
            setCurrent({ postalCode: loc.postalCode, department: loc.department });
            onSaved?.(loc.postalCode, loc.department);
            setEditing(false);
            toast.success(t('dashboard.etudiants.postal_code.saved', 'Code postal enregistré.'));
        } catch (err) {
            toast.error(getApiErrorMessage(err, t('dashboard.etudiants.postal_code.error', 'Code postal non valide : 5 chiffres (ex. 75011).')));
        } finally {
            setSaving(false);
        }
    };

    if (editing) {
        return (
            <form className="flex items-center gap-1.5 mt-1" onSubmit={(e) => { e.preventDefault(); void save(); }}>
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <input autoFocus inputMode="numeric" maxLength={6} value={value} onChange={(e) => setValue(e.target.value)}
                    aria-label={t('dashboard.etudiants.postal_code.label', 'Code postal')} placeholder="75011"
                    className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-sm text-slate-800 dark:text-white" />
                <button type="submit" disabled={saving} aria-label={t('dashboard.etudiants.postal_code.save', 'Enregistrer')}
                    className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button type="button" onClick={() => { setEditing(false); setValue(current.postalCode ?? ''); }}
                    aria-label={t('dashboard.etudiants.postal_code.cancel', 'Annuler')}
                    className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
            </form>
        );
    }
    return (
        <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            <MapPin className="h-3.5 w-3.5" />
            {current.postalCode
                ? <span>{current.postalCode}{current.department ? ` · ${t('dashboard.etudiants.postal_code.department', 'dép. {{code}}', { code: current.department })}` : ''}</span>
                : <span className="italic">{t('dashboard.etudiants.postal_code.none', 'Code postal non renseigné')}</span>}
            <button type="button" onClick={() => setEditing(true)} title={t('dashboard.etudiants.postal_code.edit', 'Modifier le code postal')}
                aria-label={t('dashboard.etudiants.postal_code.edit', 'Modifier le code postal')}
                className="p-0.5 rounded text-slate-400 hover:text-[#3f74ff] cursor-pointer"><Pencil className="h-3 w-3" /></button>
        </p>
    );
}

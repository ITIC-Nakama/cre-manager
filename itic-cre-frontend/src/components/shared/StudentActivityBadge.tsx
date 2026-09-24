import { ShieldAlert, ShieldCheck, UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatElapsedSince } from '../../utils/elapsedTime';

interface Props {
    /** Compte non desactive par le staff. */
    accountActive: boolean;
    /** Connecte recemment (seuil INACTIVE_STUDENT_DAYS) — distinct de l'etat du compte. */
    isActive: boolean;
    lastActivity: string | null;
    size?: 'sm' | 'md';
}

/**
 * Trois etats qui ne doivent pas se confondre : compte desactive, actif (connexion recente) et
 * inactif (pas de connexion depuis un moment, duree affichee). Utilise partout ou un etudiant est liste.
 */
export default function StudentActivityBadge({ accountActive, isActive, lastActivity, size = 'sm' }: Props) {
    const { t, i18n } = useTranslation();

    const layout = size === 'md' ? 'gap-1.5 px-3 py-1' : 'gap-1 px-2.5 py-1';
    const iconSize = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';

    let Icon = ShieldCheck;
    let tone = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
    let label = t('dashboard.etudiants.table.active', 'Actif');

    if (!accountActive) {
        Icon = UserX;
        tone = 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        label = t('dashboard.etudiants.table.account_disabled', 'Compte désactivé');
    } else if (!isActive) {
        Icon = ShieldAlert;
        tone = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
        label = lastActivity
            ? t('dashboard.etudiants.table.inactive_since', {
                duration: formatElapsedSince(lastActivity, i18n.language),
                defaultValue: 'Inactif depuis {{duration}}',
            })
            : t('dashboard.etudiants.table.never_connected', 'Jamais connecté');
    }

    return (
        <span
            title={lastActivity ? t('dashboard.etudiants.detail.last_activity', { date: new Date(lastActivity).toLocaleString(i18n.language) }) : undefined}
            className={`inline-flex items-center whitespace-nowrap rounded-full border text-xs font-semibold ${layout} ${tone}`}
        >
            <Icon className={`${iconSize} shrink-0`} />
            {label}
        </span>
    );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchMyLocation } from '../../api-s/requests/StudentLocationRequest';
import { useUserStore } from '../../store/UserStore';

const KEY = ['me', 'postal-code'] as const;

/** Bandeau discret du tableau de bord étudiant tant que le code postal manque ; « plus tard » le masque sur cet appareil. */
export default function PostalCodeBanner() {
    const { t } = useTranslation();
    const { user } = useUserStore();
    const storageKey = `cre-postal-banner-dismissed:${user?.id ?? ''}`;
    const [dismissed, setDismissed] = useState(() => {
        try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
    });
    const { data } = useQuery({ queryKey: KEY, queryFn: fetchMyLocation, enabled: !dismissed, staleTime: 5 * 60_000 });
    if (dismissed || !data || data.postalCode) return null;

    const dismiss = () => {
        try { localStorage.setItem(storageKey, '1'); } catch { /* stockage indisponible : masqué jusqu'au rechargement */ }
        setDismissed(true);
    };

    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#15171f] px-4 py-2.5 text-sm">
            <MapPin className="h-4 w-4 text-[#3f74ff] shrink-0" />
            <p className="flex-1 text-slate-600 dark:text-[#9aa0a6]">
                {t('student.postal_code.banner', 'Indique ton code postal : l’équipe pourra te proposer des entreprises proches de chez toi.')}{' '}
                <Link to="/student/parametres#code-postal" className="font-semibold text-[#3f74ff] hover:underline">
                    {t('student.postal_code.banner_link', 'Ajouter')}
                </Link>
            </p>
            <button type="button" onClick={dismiss} aria-label={t('student.postal_code.banner_later', 'Plus tard')}
                title={t('student.postal_code.banner_later', 'Plus tard')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import MultiSelectReference from '../basics/MultiSelectReference';
import { usePrograms } from '../../hooks/usePrograms';

/**
 * Filtre multi-formations (lot 8) : valeur = identifiants séparés par des virgules, comme dans l'URL (?formations=)
 * et dans l'appel au serveur (programIds).
 */
export default function FormationFilter({ value, onChange, className = 'w-full sm:w-72' }: {
    value: string;
    onChange: (csv: string) => void;
    className?: string;
}) {
    const { t } = useTranslation();
    const { data: programs, isLoading } = usePrograms();
    const options = useMemo(() => (programs ?? []).map((p) => ({ value: p.id, label: p.displayName })), [programs]);
    return (
        <div className={className} data-testid="formation-filter">
            <MultiSelectReference
                options={options}
                loading={isLoading}
                value={value}
                onChange={onChange}
                allLabel={t('formations.filter_all', 'Toutes les formations')}
                searchPlaceholder={t('formations.filter_search', 'Rechercher une formation…')}
                noResultsLabel={t('formations.filter_none', 'Aucune formation')}
                closeLabel={t('formations.filter_close', 'Fermer')}
                selectedCountLabel={(count) => t('formations.filter_count', '{{count}} formations', { count })}
            />
        </div>
    );
}

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fieldClass } from '../../../components/basics/fieldStyles';

const OTHER = '__other__';

/**
 * Lot 10 (C) : « Domaine » de la fiche formation en liste déroulante : les domaines déjà utilisés (valeurs distinctes),
 * plus « Autre… » qui ouvre un champ libre. Un domaine absent de la liste s'affiche dans ce champ libre.
 */
export default function DomainSelect({ value, domains, onChange }: { value: string; domains: string[]; onChange: (v: string) => void }) {
    const { t } = useTranslation();
    const options = useMemo(
        () => Array.from(new Set(domains.map((d) => d.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr')),
        [domains],
    );
    const [other, setOther] = useState(() => value.trim() !== '' && !options.includes(value.trim()));
    const selectValue = other ? OTHER : options.includes(value) ? value : '';

    return (
        <div className="space-y-2">
            <select aria-label={t('company_admin.form.domain', 'Domaine')} className={fieldClass(false, false)} value={selectValue}
                onChange={(e) => {
                    if (e.target.value === OTHER) {
                        setOther(true);
                        onChange('');
                    } else {
                        setOther(false);
                        onChange(e.target.value);
                    }
                }}>
                <option value="">{t('company_admin.form.domain_choose', 'Choisir un domaine')}</option>
                {options.map((d) => <option key={d} value={d}>{d}</option>)}
                <option value={OTHER}>{t('company_admin.form.domain_other', 'Autre…')}</option>
            </select>
            {other && (
                <input aria-label={t('company_admin.form.domain_new', 'Nouveau domaine')} className={fieldClass(false, false)} value={value}
                    maxLength={80} autoFocus placeholder={t('company_admin.form.domain_new', 'Nouveau domaine')}
                    onChange={(e) => onChange(e.target.value)} />
            )}
        </div>
    );
}

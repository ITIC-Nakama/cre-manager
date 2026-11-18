import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building, Home, MapPin } from 'lucide-react';
import { fieldClass } from '../basics/fieldStyles';
import type { AddressForm } from '../../api-s/requests/StudentAddressRequest';
import { lookupCities, type AddressErrors } from '../../utils/address';

type Field = keyof AddressForm;

interface Props {
    value: AddressForm;
    onChange: (next: AddressForm) => void;
    /** Erreurs à afficher (déjà filtrées : champ touché ou envoi tenté). */
    errors: AddressErrors;
    onBlurField?: (field: Field) => void;
    disabled?: boolean;
    idPrefix?: string;
}

/**
 * Section « Adresse » (inscription et profil de l'étudiant, lot 10) : rue, complément, code postal, ville.
 * Code postal à 5 chiffres : la ou les villes sont proposées par geo.api.gouv.fr ; sans réponse, saisie libre, sans erreur.
 */
export default function AddressFields({ value, onChange, errors, onBlurField, disabled, idPrefix = 'address' }: Props) {
    const { t } = useTranslation();
    const [cities, setCities] = useState<string[]>([]);
    // Ville proposée automatiquement : remplacée si le code postal change, jamais si l'étudiant l'a tapée lui-même.
    const autoCity = useRef<string | null>(null);
    const valueRef = useRef(value);
    valueRef.current = value;

    useEffect(() => {
        const code = value.postalCode.trim();
        setCities([]);
        if (!/^\d{5}$/.test(code)) return;
        let cancelled = false;
        lookupCities(code).then((found) => {
            if (cancelled) return;
            setCities(found);
            const current = valueRef.current;
            const untouched = !current.city.trim() || current.city === autoCity.current;
            if (found.length === 1 && untouched) {
                autoCity.current = found[0];
                onChange({ ...current, city: found[0] });
            }
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- seul le code postal déclenche la recherche
    }, [value.postalCode]);

    const set = (field: Field, v: string) => {
        if (field === 'city') autoCity.current = null;
        onChange({ ...value, [field]: v });
    };
    const message = (field: Field) => {
        const code = errors[field];
        return code ? t(`address.errors.${code}`) : null;
    };
    const label = (text: string, required: boolean, htmlFor: string) => (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {text} {required ? <span className="text-rose-500">*</span>
                : <span className="text-xs font-normal text-slate-400">({t('address.optional', 'facultatif')})</span>}
        </label>
    );
    const errorText = (field: Field) => {
        const m = message(field);
        return m ? <p id={`${idPrefix}-${field}-error`} className="text-red-500 text-xs">{m}</p> : null;
    };
    const aria = (field: Field) => ({
        'aria-invalid': !!errors[field],
        'aria-describedby': errors[field] ? `${idPrefix}-${field}-error` : undefined,
    });

    return (
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
            <div className="space-y-2 sm:col-span-6">
                {label(t('address.line1_label', 'N° et rue'), true, `${idPrefix}-line1`)}
                <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input id={`${idPrefix}-line1`} autoComplete="address-line1" maxLength={120} disabled={disabled}
                        placeholder={t('address.line1_placeholder', '12 rue de la Paix')}
                        className={fieldClass(!!errors.addressLine1)} value={value.addressLine1} {...aria('addressLine1')}
                        onChange={(e) => set('addressLine1', e.target.value)} onBlur={() => onBlurField?.('addressLine1')} />
                </div>
                {errorText('addressLine1')}
            </div>
            <div className="space-y-2 sm:col-span-6">
                {label(t('address.line2_label', 'Complément'), false, `${idPrefix}-line2`)}
                <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input id={`${idPrefix}-line2`} autoComplete="address-line2" maxLength={120} disabled={disabled}
                        placeholder={t('address.line2_placeholder', 'Bâtiment, étage, appartement…')}
                        className={fieldClass(!!errors.addressLine2)} value={value.addressLine2} {...aria('addressLine2')}
                        onChange={(e) => set('addressLine2', e.target.value)} onBlur={() => onBlurField?.('addressLine2')} />
                </div>
                {errorText('addressLine2')}
            </div>
            <div className="space-y-2 sm:col-span-2">
                {label(t('address.postal_code_label', 'Code postal'), true, `${idPrefix}-postal`)}
                <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input id={`${idPrefix}-postal`} inputMode="numeric" autoComplete="postal-code" maxLength={5} disabled={disabled}
                        placeholder="75011" className={fieldClass(!!errors.postalCode)} value={value.postalCode} {...aria('postalCode')}
                        onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                        onBlur={() => onBlurField?.('postalCode')} />
                </div>
                {errorText('postalCode')}
            </div>
            <div className="space-y-2 sm:col-span-4">
                {label(t('address.city_label', 'Ville'), true, `${idPrefix}-city`)}
                {cities.length > 1 ? (
                    <select id={`${idPrefix}-city`} disabled={disabled} className={fieldClass(!!errors.city, false)} {...aria('city')}
                        value={cities.includes(value.city) ? value.city : ''}
                        onChange={(e) => set('city', e.target.value)} onBlur={() => onBlurField?.('city')}>
                        <option value="">{t('address.city_choose', 'Choisis ta ville')}</option>
                        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                ) : (
                    <input id={`${idPrefix}-city`} autoComplete="address-level2" maxLength={80} disabled={disabled}
                        placeholder={t('address.city_placeholder', 'Paris')}
                        className={fieldClass(!!errors.city, false)} value={value.city} {...aria('city')}
                        onChange={(e) => set('city', e.target.value)} onBlur={() => onBlurField?.('city')} />
                )}
                {errorText('city')}
            </div>
        </div>
    );
}

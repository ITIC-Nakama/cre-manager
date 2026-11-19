import { useMemo, useState } from 'react';
import type { AddressForm } from '../api-s/requests/StudentAddressRequest';
import { validateAddress, type AddressErrors } from '../utils/address';

/**
 * État de la section « Adresse » avec validation en direct : une erreur s'affiche dès que le champ a été quitté,
 * ou pour tous les champs après une tentative d'envoi. Les erreurs du serveur s'ajoutent jusqu'à la prochaine saisie.
 */
export function useAddressForm(initial: AddressForm) {
    const [value, setValueState] = useState<AddressForm>(initial);
    const [touched, setTouched] = useState<Partial<Record<keyof AddressForm, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);
    const [serverErrors, setServerErrors] = useState<AddressErrors>({});

    const localErrors = useMemo(() => validateAddress(value), [value]);
    const visibleErrors = useMemo(() => {
        const out: AddressErrors = {};
        for (const key of Object.keys(localErrors) as (keyof AddressForm)[]) {
            if (submitted || touched[key]) out[key] = localErrors[key];
        }
        return { ...serverErrors, ...out };
    }, [localErrors, serverErrors, submitted, touched]);

    return {
        value,
        setValue: (next: AddressForm) => { setValueState(next); setServerErrors({}); },
        errors: visibleErrors,
        isValid: Object.keys(localErrors).length === 0,
        touch: (field: keyof AddressForm) => setTouched((t) => ({ ...t, [field]: true })),
        /** À appeler à l'envoi : affiche toutes les erreurs ; vrai si l'adresse est valide. */
        submit: () => { setSubmitted(true); return Object.keys(localErrors).length === 0; },
        setServerErrors,
    };
}

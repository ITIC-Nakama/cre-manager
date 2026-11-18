import type { AddressForm } from '../api-s/requests/StudentAddressRequest';

/** Codes d'erreur de l'adresse, identiques à ceux du serveur (UserRegisterDto, StudentAddressService). */
export type AddressErrorCode =
    | 'ADDRESS_LINE1_REQUIRED' | 'ADDRESS_LINE1_TOO_LONG' | 'ADDRESS_LINE2_TOO_LONG'
    | 'POSTAL_CODE_REQUIRED' | 'POSTAL_CODE_INVALID' | 'CITY_REQUIRED' | 'CITY_TOO_LONG';

export type AddressErrors = Partial<Record<keyof AddressForm, AddressErrorCode>>;

export const EMPTY_ADDRESS: AddressForm = { addressLine1: '', addressLine2: '', postalCode: '', city: '' };

const ADDRESS_CODES: AddressErrorCode[] = ['ADDRESS_LINE1_REQUIRED', 'ADDRESS_LINE1_TOO_LONG', 'ADDRESS_LINE2_TOO_LONG',
    'POSTAL_CODE_REQUIRED', 'POSTAL_CODE_INVALID', 'CITY_REQUIRED', 'CITY_TOO_LONG'];

/** Mêmes règles que le serveur : rue, code postal (exactement 5 chiffres) et ville obligatoires ; complément facultatif. */
export function validateAddress(a: AddressForm): AddressErrors {
    const errors: AddressErrors = {};
    const line1 = a.addressLine1.trim();
    const postal = a.postalCode.trim();
    const city = a.city.trim();
    if (!line1) errors.addressLine1 = 'ADDRESS_LINE1_REQUIRED';
    else if (line1.length > 120) errors.addressLine1 = 'ADDRESS_LINE1_TOO_LONG';
    if (a.addressLine2.trim().length > 120) errors.addressLine2 = 'ADDRESS_LINE2_TOO_LONG';
    if (!postal) errors.postalCode = 'POSTAL_CODE_REQUIRED';
    else if (!/^\d{5}$/.test(postal)) errors.postalCode = 'POSTAL_CODE_INVALID';
    if (!city) errors.city = 'CITY_REQUIRED';
    else if (city.length > 80) errors.city = 'CITY_TOO_LONG';
    return errors;
}

/** Erreurs d'adresse renvoyées par le serveur (400, champ → code), pour les afficher comme les erreurs locales. */
export function serverAddressErrors(data: unknown): AddressErrors {
    const out: AddressErrors = {};
    if (!data || typeof data !== 'object') return out;
    for (const key of ['addressLine1', 'addressLine2', 'postalCode', 'city'] as const) {
        const code = (data as Record<string, unknown>)[key];
        if (typeof code === 'string' && (ADDRESS_CODES as string[]).includes(code)) out[key] = code as AddressErrorCode;
    }
    return out;
}

export function trimAddress(a: AddressForm): AddressForm {
    return { addressLine1: a.addressLine1.trim(), addressLine2: a.addressLine2.trim(), postalCode: a.postalCode.trim(), city: a.city.trim() };
}

/**
 * Villes d'un code postal, par l'API publique de l'État (geo.api.gouv.fr, sans clé), appelée depuis le navigateur.
 * Réseau coupé, API muette ou réponse inattendue : liste vide, sans erreur (l'étudiant tape la ville à la main).
 */
export async function lookupCities(postalCode: string, timeoutMs = 4000): Promise<string[]> {
    if (!/^\d{5}$/.test(postalCode)) return [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom`, { signal: controller.signal });
        if (!response.ok) return [];
        const body: unknown = await response.json();
        if (!Array.isArray(body)) return [];
        const names = body.map((c) => (c && typeof c === 'object' ? (c as { nom?: unknown }).nom : null))
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
        return Array.from(new Set(names)).sort((x, y) => x.localeCompare(y, 'fr'));
    } catch {
        return [];
    } finally {
        clearTimeout(timer);
    }
}

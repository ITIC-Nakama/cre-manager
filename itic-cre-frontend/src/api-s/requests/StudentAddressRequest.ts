import { apiClient } from '../AxiosApiClient';
import { unwrap } from '../unwrap';

/** Adresse postale de l'étudiant connecté (lot 10) : dossier administratif, jamais montrée aux entreprises. */
export interface StudentAddress {
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    city: string | null;
    complete: boolean;
}

export interface AddressForm {
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    city: string;
}

export const MY_ADDRESS_KEY = ['me', 'address'] as const;

export const fetchMyAddress = () => apiClient.get('/me/address').then((r) => unwrap<StudentAddress>(r));
export const updateMyAddress = (form: AddressForm) =>
    apiClient.put('/me/address', form).then((r) => unwrap<StudentAddress>(r));

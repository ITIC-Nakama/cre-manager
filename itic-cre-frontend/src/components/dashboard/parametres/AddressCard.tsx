import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import AddressFields from '../../shared/AddressFields';
import { useAddressForm } from '../../../hooks/useAddressForm';
import { fetchMyAddress, MY_ADDRESS_KEY, updateMyAddress, type StudentAddress } from '../../../api-s/requests/StudentAddressRequest';
import { serverAddressErrors, trimAddress } from '../../../utils/address';
import { getApiErrorMessage } from '../../../utils/errorHelper';

/** Profil étudiant (lot 10) : bloc « Adresse », modifiable, jamais effaçable (mêmes règles que l'inscription). Tutoiement. */
export default function AddressCard() {
    const { data } = useQuery({ queryKey: MY_ADDRESS_KEY, queryFn: fetchMyAddress });
    if (!data) return null;
    return <AddressCardForm key={`${data.addressLine1 ?? ''}|${data.postalCode ?? ''}|${data.city ?? ''}`} initial={data} />;
}

function toForm(a: StudentAddress) {
    return { addressLine1: a.addressLine1 ?? '', postalCode: a.postalCode ?? '', city: a.city ?? '' };
}

function AddressCardForm({ initial }: { initial: StudentAddress }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { hash } = useLocation();
    const ref = useRef<HTMLDivElement>(null);
    const address = useAddressForm(toForm(initial));

    // Lien du bandeau (#adresse) : amène directement au bloc.
    useEffect(() => {
        if (hash === '#adresse') ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, [hash]);

    const save = useMutation({
        mutationFn: () => updateMyAddress(trimAddress(address.value)),
        onSuccess: (saved) => {
            queryClient.setQueryData(MY_ADDRESS_KEY, saved);
            queryClient.invalidateQueries({ queryKey: ['me', 'postal-code'] });
            toast.success(t('address.saved', 'Adresse enregistrée.'));
        },
        onError: (err: unknown) => {
            address.setServerErrors(serverAddressErrors((err as { response?: { data?: { data?: unknown } } })?.response?.data?.data));
            toast.error(getApiErrorMessage(err, t('address.save_error', 'Adresse non enregistrée : vérifie les champs.')));
        },
    });
    const changed = JSON.stringify(trimAddress(address.value)) !== JSON.stringify(trimAddress(toForm(initial)));

    return (
        <div className="space-y-3 scroll-mt-24" id="adresse" ref={ref}>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('address.title', 'Adresse')}</h2>
            <form noValidate className="space-y-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"
                onSubmit={(e) => { e.preventDefault(); if (address.submit() && changed) save.mutate(); }}>
                <AddressFields value={address.value} onChange={address.setValue} errors={address.errors}
                    onBlurField={address.touch} disabled={save.isPending} idPrefix="profile-address" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('address.privacy_note', 'Ton adresse sert à ton dossier administratif (conventions, contrats). Seuls toi, ton conseiller et l’équipe ITIC la voient.')}
                    </p>
                    <button type="submit" disabled={!changed || save.isPending}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3f74ff] text-white text-sm font-semibold hover:bg-[#2f63ee] disabled:opacity-50 cursor-pointer shrink-0">
                        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{t('address.save', 'Enregistrer')}
                    </button>
                </div>
            </form>
        </div>
    );
}

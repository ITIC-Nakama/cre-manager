import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, MapPin } from 'lucide-react';
import { fieldClass } from '../../basics/fieldStyles';
import { fetchMyLocation, updateMyPostalCode } from '../../../api-s/requests/StudentLocationRequest';
import type { StudentLocation } from '../../../api-s/requests/StudentLocationRequest';
import { getApiErrorMessage } from '../../../utils/errorHelper';

const MY_LOCATION_KEY = ['me', 'postal-code'] as const;

/** Profil étudiant : code postal (département déduit), pour la carte de l'équipe. Tutoiement. */
export default function PostalCodeCard() {
    const { t } = useTranslation();
    const { data } = useQuery({ queryKey: MY_LOCATION_KEY, queryFn: fetchMyLocation });
    if (!data) return null;
    return <PostalCodeForm key={data.postalCode ?? ''} initial={data} t={t} />;
}

function PostalCodeForm({ initial, t }: { initial: StudentLocation; t: ReturnType<typeof useTranslation>['t'] }) {
    const queryClient = useQueryClient();
    const [value, setValue] = useState(initial.postalCode ?? '');
    const save = useMutation({
        mutationFn: () => updateMyPostalCode(value),
        onSuccess: (loc) => {
            queryClient.setQueryData(MY_LOCATION_KEY, loc);
            toast.success(t('student.postal_code.saved', 'Code postal enregistré.'));
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t('student.postal_code.error', 'Code postal non valide : 5 chiffres (ex. 75011).'))),
    });
    const changed = value.replace(/\s/g, '') !== (initial.postalCode ?? '');

    return (
        <div className="space-y-3" id="code-postal">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('student.postal_code.title', 'Code postal')}</h2>
            <form className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"
                onSubmit={(e) => { e.preventDefault(); if (changed) save.mutate(); }}>
                <span className="flex items-center gap-4 flex-1">
                    <span className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                        <MapPin className="h-5 w-5" />
                    </span>
                    <span className="space-y-0.5">
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">
                            {initial.departmentName
                                ? t('student.postal_code.department', 'Département : {{name}} ({{code}})', { name: initial.departmentName, code: initial.department })
                                : t('student.postal_code.missing', 'Pas encore renseigné')}
                        </span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">
                            {t('student.postal_code.explanation', 'L’équipe voit seulement ton département, pour te proposer des entreprises proches de chez toi.')}
                        </span>
                    </span>
                </span>
                <span className="flex items-center gap-2">
                    <input inputMode="numeric" maxLength={6} aria-label={t('student.postal_code.title', 'Code postal')} placeholder="75011"
                        className={`${fieldClass(false, false)} w-28`} value={value} onChange={(e) => setValue(e.target.value)} />
                    <button type="submit" disabled={!changed || save.isPending}
                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-[#3f74ff] text-white text-sm font-semibold hover:bg-[#2f63ee] disabled:opacity-50 cursor-pointer">
                        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{t('student.postal_code.save', 'Enregistrer')}
                    </button>
                </span>
            </form>
        </div>
    );
}

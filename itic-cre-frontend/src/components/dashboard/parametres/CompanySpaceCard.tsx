import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { fetchMyCompanySpace, updateMyCompanySpace } from '../../../api-s/requests/CompanySpaceRequest';

const KEY = ['me', 'company-space'] as const;

/** Profil étudiant : « Apparaître dans l'Espace entreprise » (activé par défaut, tutoiement). */
export default function CompanySpaceCard() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { data } = useQuery({ queryKey: KEY, queryFn: fetchMyCompanySpace });
    const update = useMutation({
        mutationFn: (visible: boolean) => updateMyCompanySpace(visible),
        onSuccess: (pref) => {
            queryClient.setQueryData(KEY, pref);
            toast.success(t('student.company_space.saved', 'Préférence enregistrée.'));
        },
        onError: () => toast.error(t('student.company_space.error', 'La préférence n’a pas pu être enregistrée.')),
    });
    const checked = data ? data.visible : true;

    return (
        <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('student.company_space.title', 'Espace entreprise')}</h2>
            <label className="flex items-center justify-between gap-4 p-5 cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <span className="flex items-center gap-4">
                    <span className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                        <Building2 className="h-5 w-5" />
                    </span>
                    <span className="space-y-0.5">
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">
                            {t('student.company_space.toggle', 'Apparaître dans l’Espace entreprise')}
                        </span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">
                            {t('student.company_space.explanation', 'Quand ton CV est validé et tant que tu n’as pas de contrat, les entreprises partenaires voient ton prénom, ton nom, ta formation et ton CV dans l’annuaire de l’école. Ni ton e-mail ni ton téléphone : elles passent par le Pôle Entreprises.')}
                        </span>
                    </span>
                </span>
                <input type="checkbox" role="switch" className="h-5 w-5 accent-[#3f74ff] shrink-0 cursor-pointer" checked={checked}
                    disabled={!data || update.isPending} onChange={(e) => update.mutate(e.target.checked)} />
            </label>
        </div>
    );
}

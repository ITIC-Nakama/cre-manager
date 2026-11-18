import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProgramView from '../../../components/company/ProgramView';
import { fetchCompanyProgram } from '../../../api-s/requests/CompanySpaceRequest';

/** /entreprise/candidats/:slug : même adresse courte que les anciens liens itic.short.gy. */
export default function CompanyProgramPage() {
    const { t } = useTranslation();
    const { slug = '' } = useParams();
    // Les liens vers les CV sont signés pour 15 minutes : la page se recharge d'elle-même avant leur expiration.
    const { data, isLoading, isError } = useQuery({
        queryKey: ['company-space', 'program', slug],
        queryFn: () => fetchCompanyProgram(slug),
        retry: false,
        staleTime: 5 * 60_000,
        refetchInterval: 10 * 60_000,
    });

    return (
        <div className="space-y-6">
            <Link to="/entreprise/candidats" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#3f74ff]">
                <ArrowLeft className="h-4 w-4" /> {t('company.program.back', 'Toutes les formations')}
            </Link>
            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : isError || !data ? (
                <div className="bg-white dark:bg-[#15171f] rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
                    <p className="font-semibold text-slate-800 dark:text-white">{t('company.program.not_found', 'Cette formation n’est pas disponible.')}</p>
                    <Link to="/entreprise/candidats" className="inline-block mt-3 text-sm font-semibold text-[#3f74ff]">
                        {t('company.program.see_all', 'Voir toutes les formations')}
                    </Link>
                </div>
            ) : (
                <ProgramView page={data} />
            )}
        </div>
    );
}

import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api-s/AxiosApiClient';
import { unwrap } from '../../api-s/unwrap';

interface MyFormation { formation: string | null; pedagogyUrl: string | null }

/** « Ma fiche formation » : page de la formation sur le site pédagogique, dans un nouvel onglet. Masqué sans page. */
export default function MyFormationButton() {
    const { t } = useTranslation();
    const { data } = useQuery({
        queryKey: ['me', 'formation'],
        queryFn: () => apiClient.get('/me/formation').then((r) => unwrap<MyFormation>(r)),
        staleTime: 30 * 60_000,
    });
    if (!data?.pedagogyUrl) return null;
    return (
        <a href={data.pedagogyUrl} target="_blank" rel="noopener noreferrer"
            title={data.formation ?? undefined}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#3f74ff] hover:text-[#3f74ff] transition-colors shrink-0">
            <BookOpen className="h-3.5 w-3.5" /> {t('student.my_formation', 'Ma fiche formation')}
        </a>
    );
}

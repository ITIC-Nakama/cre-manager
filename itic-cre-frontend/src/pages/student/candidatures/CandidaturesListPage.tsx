import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Briefcase, Loader2, Plus } from 'lucide-react';
import { useMyCandidatures, useCreateCandidature } from '../../../hooks/useCandidatures';
import { useApplicationStatuses } from '../../../hooks/useApplications';
import type { CandidaturePayload } from '../../../types/models/Application';
import CandidatureCard from './components/CandidatureCard';
import CandidatureFormModal from './components/CandidatureFormModal';
import { isCompleted } from './utils';

type Tab = 'in_progress' | 'completed';

export default function CandidaturesListPage() {
    const { t } = useTranslation();
    const [tab, setTab] = useState<Tab>('in_progress');
    const [formOpen, setFormOpen] = useState(false);

    const { data: statuses } = useApplicationStatuses();
    const { data, isLoading } = useMyCandidatures();
    const createMutation = useCreateCandidature();

    const sorted = useMemo(
        () => [...(data?.content ?? [])].sort((a, b) => new Date(b.dateModification).getTime() - new Date(a.dateModification).getTime()),
        [data]
    );

    const inProgress = useMemo(() => sorted.filter((c) => !isCompleted(c)), [sorted]);
    const completed = useMemo(() => sorted.filter((c) => isCompleted(c)), [sorted]);
    const visible = tab === 'in_progress' ? inProgress : completed;

    const handleCreate = async (payload: CandidaturePayload) => {
        await createMutation.mutateAsync(payload);
        toast.success(t('dashboard.candidatures.student.toast.created'));
        setFormOpen(false);
    };

    return (
        <div className="flex flex-col gap-6 pb-12 animate-fadeIn">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('dashboard.candidatures.student.title')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('dashboard.candidatures.student.subtitle', { count: sorted.length })}
                    </p>
                </div>
                <button
                    onClick={() => setFormOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    {t('dashboard.candidatures.student.add_button')}
                </button>
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
                {(['in_progress', 'completed'] as Tab[]).map((tabKey) => (
                    <button
                        key={tabKey}
                        onClick={() => setTab(tabKey)}
                        className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                            tab === tabKey
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        {t(`dashboard.candidatures.student.tabs.${tabKey}`)}
                        <span className="ml-1.5 text-xs opacity-70">
                            ({tabKey === 'in_progress' ? inProgress.length : completed.length})
                        </span>
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
            ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Briefcase className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                    {t(tab === 'in_progress' ? 'dashboard.candidatures.student.empty_in_progress' : 'dashboard.candidatures.student.empty_completed')}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map((candidature) => (
                        <CandidatureCard key={candidature.id} candidature={candidature} statuses={statuses ?? []} />
                    ))}
                </div>
            )}

            {formOpen && (
                <CandidatureFormModal
                    saving={createMutation.isPending}
                    onClose={() => setFormOpen(false)}
                    onSave={handleCreate}
                />
            )}
        </div>
    );
}

import { useMemo, useState } from 'react';
import { AlertCircle, Briefcase, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UserAvatar from '../../../../components/shared/UserAvatar';
import ApplicationCard from './ApplicationCard';
import ApplicationDetail from './ApplicationDetail';
import type { StudentGroup } from '../types';
import { isActiveContract } from '../types';
import type { ApplicationRow } from '../../../../types/models/Application';

interface Props {
    group: StudentGroup;
    onClose: () => void;
}

export default function StudentDrawer({ group, onClose }: Props) {
    const { t } = useTranslation();
    const [selectedApp, setSelectedApp] = useState<ApplicationRow | null>(null);

    // Separe les candidatures "sous contrat" (Offre reçue — actif, en attente ou termine) du reste
    // du pipeline (À postuler, Postulé, Entretien, Refusé) — sans ca, les deux sont mélangés dans
    // une liste plate et il faut lire chaque carte une par une pour retrouver le contrat.
    const { contractApplications, pipelineApplications } = useMemo(() => {
        const contract: ApplicationRow[] = [];
        const pipeline: ApplicationRow[] = [];
        for (const app of group.applications) {
            (app.status.compteCommeContrat ? contract : pipeline).push(app);
        }
        // Au sein du contrat : actif en premier, puis en attente de validation, puis termine.
        const rank = (app: ApplicationRow) => (isActiveContract(app) ? 0 : !app.contractVerified ? 1 : 2);
        contract.sort((a, b) => rank(a) - rank(b));
        return { contractApplications: contract, pipelineApplications: pipeline };
    }, [group.applications]);

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

            {/* Drawer panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-in-right">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                            profilePicture={group.profilePicture}
                            firstName={group.firstName}
                            lastName={group.lastName}
                            className="h-10 w-10 flex-shrink-0"
                            enlargeOnClick
                        />
                        <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                                {group.firstName} {group.lastName}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{group.email}</p>
                            {group.promotion && (
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
                                    {group.promotion.nom}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer flex-shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                    <span className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" />
                        <strong className="text-slate-700 dark:text-slate-200">{group.applications.length}</strong>
                        &nbsp;candidature{group.applications.length > 1 ? 's' : ''}
                    </span>
                    {group.staleCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {group.staleCount} en retard
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {selectedApp ? (
                        <ApplicationDetail
                            app={selectedApp}
                            onBack={() => setSelectedApp(null)}
                            onUpdated={(patch) => setSelectedApp((prev) => prev ? { ...prev, ...patch } : prev)}
                            siblingApplications={group.applications}
                        />
                    ) : group.applications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-slate-400">
                            <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-sm">Aucune candidature</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {contractApplications.length > 0 && (
                                <div className="space-y-3">
                                    {pipelineApplications.length > 0 && (
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            {t('dashboard.candidatures.detail.contract_section', 'Contrat')}
                                        </p>
                                    )}
                                    {contractApplications.map((app) => (
                                        <ApplicationCard
                                            key={app.id}
                                            app={app}
                                            onClick={() => setSelectedApp(app)}
                                        />
                                    ))}
                                </div>
                            )}
                            {pipelineApplications.length > 0 && (
                                <div className="space-y-3">
                                    {contractApplications.length > 0 && (
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            {t('dashboard.candidatures.detail.pipeline_section', 'Candidatures')}
                                        </p>
                                    )}
                                    {pipelineApplications.map((app) => (
                                        <ApplicationCard
                                            key={app.id}
                                            app={app}
                                            onClick={() => setSelectedApp(app)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

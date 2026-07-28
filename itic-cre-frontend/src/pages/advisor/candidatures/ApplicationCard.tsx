import { AlertCircle, Eye } from 'lucide-react';
import StatusBadge from '../../../components/shared/StatusBadge';
import { formatDate } from './types';
import type { ApplicationRow } from '../../../types/models/Application';

interface Props {
    app: ApplicationRow;
    onClick: () => void;
}

export default function ApplicationCard({ app, onClick }: Props) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md group cursor-pointer ${
                app.stale
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 hover:border-amber-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
            }`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{app.poste}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{app.entreprise}</p>
                </div>
                <Eye className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-0.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge nom={app.status.nom} couleur={app.status.couleur} />
                {app.stale && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        En retard
                    </span>
                )}
                {app.typeContrat && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">{app.typeContrat.label}</span>
                )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Mis à jour le {formatDate(app.dateModification)}
            </p>
        </button>
    );
}

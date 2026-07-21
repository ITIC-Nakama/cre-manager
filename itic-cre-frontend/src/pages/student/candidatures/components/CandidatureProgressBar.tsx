import type { ApplicationStatus, Candidature } from '../../../../types/models/Application';
import { highestReachedOrdre } from '../utils';

interface Props {
    candidature: Candidature;
    statuses: ApplicationStatus[];
}

const SEGMENT_ORDRES = [1, 2, 3, 4, 5];

export default function CandidatureProgressBar({ candidature, statuses }: Props) {
    const reachedOrdre = highestReachedOrdre(candidature, statuses);
    const isRefused = candidature.status.ordre === 6;

    return (
        <div className="flex items-center gap-1">
            {SEGMENT_ORDRES.map((ordre) => (
                <span
                    key={ordre}
                    className={`h-1.5 flex-1 rounded-full ${
                        ordre > reachedOrdre
                            ? 'bg-slate-100 dark:bg-slate-800'
                            : isRefused
                                ? 'bg-rose-400 dark:bg-rose-500'
                                : 'bg-indigo-500 dark:bg-indigo-400'
                    }`}
                />
            ))}
        </div>
    );
}

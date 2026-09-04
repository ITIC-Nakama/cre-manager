import { AlertCircle, Briefcase, ChevronRight, GraduationCap, Handshake, ShieldAlert } from 'lucide-react';
import UserAvatar from '../../../../components/shared/UserAvatar';
import type { StudentGroup } from '../types';

interface Props {
    group: StudentGroup;
    onClick: () => void;
}

export default function StudentCard({ group, onClick }: Props) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group cursor-pointer"
        >
            {/* Top row */}
            <div className="flex items-center gap-3 mb-3">
                <UserAvatar
                    profilePicture={group.profilePicture}
                    firstName={group.firstName}
                    lastName={group.lastName}
                    className="h-11 w-11 flex-shrink-0"
                    enlargeOnClick
                />
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white truncate text-sm">
                        {group.firstName} {group.lastName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{group.email}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>

            {/* Promotion */}
            {group.promotion && (
                <div className="flex items-center gap-1 mb-3">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{group.promotion.nom}</span>
                </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                    <Briefcase className="h-3 w-3" />
                    {group.applications.length} candidature{group.applications.length > 1 ? 's' : ''}
                </span>
                {group.staleCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                        <AlertCircle className="h-3 w-3" />
                        {group.staleCount} en retard
                    </span>
                )}
                {group.underContract && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                        <Handshake className="h-3 w-3" />
                        Sous contrat
                    </span>
                )}
                {group.contractNeedsVerification && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                        <ShieldAlert className="h-3 w-3" />
                        À vérifier
                    </span>
                )}
            </div>

            {/* Status mini bar */}
            {group.applications.length > 0 && (
                <div className="mt-3 flex gap-1 flex-wrap">
                    {[...new Map(group.applications.map(a => [a.status.nom, a.status])).values()]
                        .slice(0, 4)
                        .map(status => (
                            <span
                                key={status.nom}
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{
                                    backgroundColor: `${status.couleur ?? '#9CA3AF'}22`,
                                    color: status.couleur ?? '#9CA3AF',
                                    border: `1px solid ${status.couleur ?? '#9CA3AF'}44`,
                                }}
                            >
                                {status.nom}
                            </span>
                        ))}
                </div>
            )}
        </button>
    );
}

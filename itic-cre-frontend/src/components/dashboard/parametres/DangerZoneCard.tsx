import { Trash2 } from 'lucide-react';

interface DangerZoneCardProps {
  onDeleteAccount: () => void;
}

export default function DangerZoneCard({ onDeleteAccount }: DangerZoneCardProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-red-600 dark:text-red-400">Zone de danger</h2>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Supprimer mon compte
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
              Cette action est irréversible. Toutes vos données seront effacées.
            </p>
          </div>

          <button
            id="btn-delete-account"
            onClick={onDeleteAccount}
            className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-bold px-4 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            <span>Supprimer</span>
          </button>
        </div>
      </div>
    </div>
  );
}

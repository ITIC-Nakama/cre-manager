import { Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Grade } from '../../../../types/models/Gamification';

interface GradeCardProps {
  grade: Grade;
  onEdit: (grade: Grade) => void;
  onDelete: (id: string, name: string) => void;
}

export default function GradeCard({ grade, onEdit, onDelete }: GradeCardProps) {
  const { t } = useTranslation();

  return (
    <div className="group flex flex-col justify-between p-6 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors duration-300 flex items-center justify-center">
            <span className="text-3xl select-none leading-none" role="img" aria-label="grade icon">
              {grade.icone || '🏅'}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {t('dashboard.formation.order', { val: grade.ordre })}
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {grade.nom}
        </h3>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          {t('dashboard.gamification.grade_xp_threshold', { xp: grade.xpMinimum })}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
        <button
          onClick={() => onEdit(grade)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer border border-slate-200/40 dark:border-slate-700/40"
        >
          <Edit2 className="h-3.5 w-3.5" />
          {t('dashboard.formation.btn_edit')}
        </button>
        <button
          onClick={() => onDelete(grade.id, grade.nom)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 transition-all cursor-pointer border border-red-100/30 dark:border-red-900/30"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('dashboard.formation.btn_delete')}
        </button>
      </div>
    </div>
  );
}

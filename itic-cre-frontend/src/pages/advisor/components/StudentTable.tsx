import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, AlertCircle, Star, Loader2, FileText, ArrowRight } from 'lucide-react';
import type { StudentRow } from '../../../types/models/Dashboard';
import NotifyStudentModal from '../../../components/shared/NotifyStudentModal';

interface Props {
  students: StudentRow[];
  loading: boolean;
  onNotify: (student: StudentRow, message?: string) => Promise<void>;
}

function sortByAttention(students: StudentRow[]): StudentRow[] {
  return [...students].sort((a, b) => {
    const scoreA = (a.staleApplicationCount > 0 ? 2 : 0) + (!a.hasCv ? 1 : 0);
    const scoreB = (b.staleApplicationCount > 0 ? 2 : 0) + (!b.hasCv ? 1 : 0);
    return scoreB - scoreA;
  });
}

export default function StudentTable({ students, loading, onNotify }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

  const displayed = sortByAttention(students).slice(0, 5);
  const hasAlerts = students.some((s) => s.staleApplicationCount > 0 || !s.hasCv);

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('dashboard.advisor.students_widget.title')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {loading ? '…' : t('dashboard.advisor.students_widget.subtitle', { count: students.length })}
            </p>
          </div>
          <button
            onClick={() => navigate('/supervisor/etudiants')}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
          >
            {t('dashboard.advisor.students_widget.see_all')} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">
            {t('dashboard.advisor.students_widget.empty')}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayed.map((student) => {
              const stale = student.staleApplicationCount > 0;
              const noCv = !student.hasCv;

              return (
                <li key={student.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-700 dark:text-indigo-300">
                    {student.firstName[0]}{student.lastName[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {student.firstName} {student.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {student.promotion && (
                        <span className="text-xs text-slate-400">{student.promotion.nom}</span>
                      )}
                      {student.grade && (
                        <span className="text-xs text-violet-500 flex items-center gap-0.5">
                          <Star className="h-3 w-3" />{student.grade.nom} · {student.xpTotal} XP
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {stale && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {t('dashboard.advisor.students_widget.stale_badge', { count: student.staleApplicationCount })}
                      </span>
                    )}
                    {noCv && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                        <FileText className="h-3 w-3" />
                        {t('dashboard.advisor.students_widget.no_cv')}
                      </span>
                    )}
                    {!stale && !noCv && (
                      <span className="text-xs text-emerald-500 font-medium">
                        {t('dashboard.advisor.students_widget.ok')}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedStudent(student)}
                    className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer flex-shrink-0"
                    title={t('dashboard.etudiants.actions.notify')}
                  >
                    <Mail className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !hasAlerts && students.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-emerald-600 dark:text-emerald-400 text-center">
            {t('dashboard.advisor.students_widget.no_alerts')}
          </div>
        )}
      </div>

      {selectedStudent && (
        <NotifyStudentModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSend={(message) => onNotify(selectedStudent, message)}
        />
      )}
    </>
  );
}

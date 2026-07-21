import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, GitFork } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

function truncateLabel(text: string, maxLen = 65): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + '…';
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Mobile-friendly Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm cursor-pointer shrink-0 min-h-[36px]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Retour</span>
      </button>

      {/* Direct link to main Skill Tree */}
      <Link
        to="/student/connaissances"
        title="Retourner à l'arbre de connaissances"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/70 transition-colors shadow-sm cursor-pointer shrink-0 min-h-[36px]"
      >
        <GitFork className="h-3.5 w-3.5" />
        <span>Arbre</span>
      </Link>

      <span className="w-px h-4 bg-slate-200 dark:bg-slate-800 hidden sm:inline-block" />

      {/* Path Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-wrap min-h-[36px]">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const displayLabel = truncateLabel(item.label, 65);
          return (
            <span key={idx} className="flex items-center gap-1.5 min-w-0">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700 shrink-0" />}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  title={item.label}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
                >
                  {displayLabel}
                </Link>
              ) : (
                <span
                  title={item.label}
                  className={isLast ? 'font-semibold text-slate-900 dark:text-white truncate' : 'truncate'}
                >
                  {displayLabel}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}

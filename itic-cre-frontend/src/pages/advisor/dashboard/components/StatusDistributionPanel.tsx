import type { ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface StatusItem {
  key: string;
  label: string;
  couleur: string;
  count: number;
}

interface Props {
  title: string;
  icon: LucideIcon;
  items: StatusItem[];
  total: number;
  loading: boolean;
  footer?: ReactNode;
  emptyLabel: string;
}

export default function StatusDistributionPanel({ title, icon: Icon, items, total, loading, footer, emptyLabel }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items
            .slice()
            .sort((a, b) => b.count - a.count)
            .map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.couleur }} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: total > 0 ? `${(item.count / total) * 100}%` : '0%',
                        backgroundColor: item.couleur,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white w-6 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          {footer && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">{footer}</div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Icon className="h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-400">{emptyLabel}</p>
        </div>
      )}
    </div>
  );
}

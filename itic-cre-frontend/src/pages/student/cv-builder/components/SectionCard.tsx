import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CvFormSectionKey } from '../../../../types/models/CVBuilder';

interface Props {
  sectionKey: CvFormSectionKey;
  title: string;
  icon: LucideIcon;
  /** Aide courte affichée sous le titre une fois la section ouverte. */
  help?: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  /** Sections ordonnables uniquement (pas l'identité ni l'accroche). */
  ordering?: { canMoveUp: boolean; canMoveDown: boolean; onMoveUp: () => void; onMoveDown: () => void };
  hidden?: { value: boolean; onToggle: () => void };
  badge?: ReactNode;
  children: ReactNode;
}

export default function SectionCard({
  sectionKey, title, icon: Icon, help, summary, open, onToggle, ordering, hidden, badge, children,
}: Props) {
  const { t } = useTranslation();
  const iconBtn = 'p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default';

  return (
    <section id={`cv-section-${sectionKey}`}
      className={`scroll-mt-24 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm transition-colors ${open ? 'border-[#3f74ff]/40' : 'border-slate-200 dark:border-slate-800'} ${hidden?.value ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={onToggle} aria-expanded={open}
          className="flex-1 flex items-center gap-3 text-left cursor-pointer min-w-0">
          <span className="h-8 w-8 rounded-xl bg-[#3f74ff]/10 text-[#3f74ff] flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </span>
          <span className="flex flex-col min-w-0">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              {title}
              {badge}
              {hidden?.value && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('studentCvBuilder.section.hiddenBadge', 'masquée')}
                </span>
              )}
            </span>
            {!open && summary && <span className="text-xs text-slate-500 truncate">{summary}</span>}
          </span>
        </button>

        {ordering && (
          <>
            <button type="button" className={iconBtn} disabled={!ordering.canMoveUp} onClick={ordering.onMoveUp}
              title={t('studentCvBuilder.section.moveUp', 'Remonter la section sur le CV')}
              aria-label={t('studentCvBuilder.section.moveUp', 'Remonter la section sur le CV')}>
              <ArrowUp className="h-4 w-4" />
            </button>
            <button type="button" className={iconBtn} disabled={!ordering.canMoveDown} onClick={ordering.onMoveDown}
              title={t('studentCvBuilder.section.moveDown', 'Descendre la section sur le CV')}
              aria-label={t('studentCvBuilder.section.moveDown', 'Descendre la section sur le CV')}>
              <ArrowDown className="h-4 w-4" />
            </button>
          </>
        )}
        {hidden && (
          <button type="button" className={iconBtn} onClick={hidden.onToggle}
            title={hidden.value ? t('studentCvBuilder.section.show', 'Afficher sur le CV') : t('studentCvBuilder.section.hide', 'Masquer sur le CV')}
            aria-label={hidden.value ? t('studentCvBuilder.section.show', 'Afficher sur le CV') : t('studentCvBuilder.section.hide', 'Masquer sur le CV')}>
            {hidden.value ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button type="button" onClick={onToggle} className={iconBtn} aria-hidden tabIndex={-1}>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 animate-fadeIn">
          {help && <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">{help}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

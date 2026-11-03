import { useState, type ComponentProps, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { compactFieldClass } from './fieldUtils';

/**
 * Libellé + champ + aide courte. `group` : le contenu contient plusieurs contrôles (étiquettes, points),
 * on rend alors un div plutôt qu'un label pour ne pas renvoyer chaque clic vers le premier champ.
 */
export function Field({ label, hint, counter, children, className = '', group = false }: {
  label: string; hint?: string; counter?: ReactNode; children: ReactNode; className?: string; group?: boolean;
}) {
  const Wrapper = group ? 'div' : 'label';
  return (
    <Wrapper className={`flex flex-col gap-1 ${className}`}>
      <span className="flex items-baseline justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
        {counter}
      </span>
      {children}
      {hint && <span className="text-[11px] leading-snug text-slate-400 dark:text-slate-500">{hint}</span>}
    </Wrapper>
  );
}

export function CharCounter({ value, max }: { value: string | null | undefined; max: number }) {
  const length = value?.length ?? 0;
  const tone = length > max ? 'text-red-500' : length > max * 0.9 ? 'text-amber-500' : 'text-slate-400';
  return <span className={`text-[11px] font-medium tabular-nums ${tone}`}>{length}/{max}</span>;
}

/** ComponentProps (et non InputHTMLAttributes) : inclut ref, transmis par register() en React 19. */
export function TextInput(props: ComponentProps<'input'>) {
  return <input type="text" {...props} className={compactFieldClass()} />;
}

export function TextArea(props: ComponentProps<'textarea'>) {
  return <textarea rows={3} {...props} className={`${compactFieldClass()} resize-y leading-relaxed`} />;
}

/** Champ mois (AAAA-MM). Les navigateurs sans input month affichent un champ texte : le motif guide la saisie. */
export function MonthInput(props: ComponentProps<'input'>) {
  return <input type="month" placeholder="AAAA-MM" pattern="\d{4}-\d{2}" {...props} className={compactFieldClass()} />;
}

/** Boutons monter / descendre / supprimer d'une entrée de liste. */
export function EntryActions({ index, count, onMove, onRemove }: {
  index: number; count: number; onMove: (from: number, to: number) => void; onRemove: () => void;
}) {
  const { t } = useTranslation();
  const btn = 'p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default';
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index, index - 1)}
        title={t('studentCvBuilder.actions.moveUp', 'Monter')} aria-label={t('studentCvBuilder.actions.moveUp', 'Monter')}>
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}
        title={t('studentCvBuilder.actions.moveDown', 'Descendre')} aria-label={t('studentCvBuilder.actions.moveDown', 'Descendre')}>
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={`${btn} hover:!text-red-600`} onClick={onRemove}
        title={t('studentCvBuilder.actions.remove', 'Supprimer')} aria-label={t('studentCvBuilder.actions.remove', 'Supprimer')}>
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-[#3f74ff] hover:text-[#3f74ff] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default">
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/** Liste d'étiquettes (compétences, technos, centres d'intérêt) : Entrée ou virgule pour ajouter. */
export function TagInput({ value, onChange, placeholder, max, maxLength }: {
  value: string[]; onChange: (next: string[]) => void; placeholder?: string; max: number; maxLength: number;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const tags = value ?? [];

  const commit = () => {
    const parts = draft.split(',').map((p) => p.trim().slice(0, maxLength)).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...tags];
    for (const part of parts) {
      if (next.length >= max) break;
      if (!next.some((tag) => tag.toLowerCase() === part.toLowerCase())) next.push(part);
    }
    onChange(next);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                aria-label={t('studentCvBuilder.actions.remove', 'Supprimer')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={draft}
        maxLength={maxLength * 3}
        disabled={tags.length >= max}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        className={compactFieldClass()}
      />
    </div>
  );
}

/** Points d'une expérience : une ligne par réalisation, 6 au maximum, 200 caractères chacun. */
export function PointsEditor({ value, onChange, max, maxLength }: {
  value: string[]; onChange: (next: string[]) => void; max: number; maxLength: number;
}) {
  const { t } = useTranslation();
  const points = value ?? [];
  const update = (i: number, text: string) => onChange(points.map((p, j) => (j === i ? text : p)));
  const move = (from: number, to: number) => {
    const next = [...points];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {points.map((point, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          <div className="flex-1 flex flex-col gap-0.5">
            <input type="text" value={point} maxLength={maxLength}
              placeholder={t('studentCvBuilder.experiences.pointPlaceholder', 'Ex : Développement d’une API REST utilisée par 3 équipes')}
              onChange={(e) => update(i, e.target.value)} className={compactFieldClass()} />
            <div className="self-end"><CharCounter value={point} max={maxLength} /></div>
          </div>
          <EntryActions index={i} count={points.length} onMove={move} onRemove={() => onChange(points.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddButton label={t('studentCvBuilder.experiences.addPoint', 'Ajouter une réalisation')}
        onClick={() => onChange([...points, ''])} disabled={points.length >= max} />
    </div>
  );
}

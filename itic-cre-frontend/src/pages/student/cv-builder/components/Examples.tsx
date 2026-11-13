import { useState, type ReactNode } from 'react';
import { ChevronDown, Plus, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ACTION_VERBS, BULLET_EXAMPLES, SUMMARY_EXAMPLES } from './guidance';

const panel = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/30';
const smallBtn = 'shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff]';

/** Bloc repliable « Besoin d'inspiration ? » : fermé par défaut pour ne pas charger l'écran. */
function Inspiration({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={panel}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[#3f74ff] dark:text-[#8fb0ff] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff] rounded-xl">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="flex-1">{title}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <div className="px-3 pb-3 flex flex-col gap-2">{children}</div>}
    </div>
  );
}

/** Mise en forme d'un exemple : **gras** et [passage à personnaliser] repérables à l'écran. */
function ExampleText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g).filter(Boolean);
  return (
    <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
      {parts.map((part, i) => part.startsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part.startsWith('[')
          ? <mark key={i} className="px-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-inherit">{part}</mark>
          : <span key={i}>{part}</span>)}
    </span>
  );
}

/**
 * Exemples d'accroche : insérés en un clic, à personnaliser (passages entre crochets). Si l'étudiant a déjà écrit
 * quelque chose, on lui demande avant de remplacer son texte : rien n'est jamais imposé.
 */
export function SummaryExamples({ current, onUse }: { current: string; onUse: (text: string) => void }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<number | null>(null);
  const examples = SUMMARY_EXAMPLES.map((text, i) => t(`studentCvBuilder.guide.summaryExamples.${i}`, text));

  return (
    <Inspiration title={t('studentCvBuilder.guide.summaryInspiration', 'Besoin d’inspiration ? 3 accroches à adapter')}>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {t('studentCvBuilder.guide.placeholderHint', 'Remplace ensuite les passages entre crochets par tes propres mots.')}
      </p>
      {examples.map((text, i) => (
        <div key={i} className="flex flex-col gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
          <ExampleText text={text} />
          {pending === i ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-600 dark:text-slate-300">{t('studentCvBuilder.guide.replaceConfirm', 'Remplacer ton accroche actuelle ?')}</span>
              <button type="button" className={`${smallBtn} bg-[#3f74ff] text-white`} onClick={() => { onUse(text); setPending(null); }}>
                {t('studentCvBuilder.guide.replaceYes', 'Remplacer')}
              </button>
              <button type="button" className={`${smallBtn} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`} onClick={() => setPending(null)}>
                {t('studentCvBuilder.guide.replaceNo', 'Garder la mienne')}
              </button>
            </div>
          ) : (
            <button type="button" className={`${smallBtn} self-start bg-[#3f74ff]/10 text-[#3f74ff] dark:text-[#8fb0ff] hover:bg-[#3f74ff]/20`}
              onClick={() => (current.trim() ? setPending(i) : onUse(text))}>
              {t('studentCvBuilder.guide.useExample', 'Utiliser cet exemple')}
            </button>
          )}
        </div>
      ))}
    </Inspiration>
  );
}

/** Exemples de réalisations chiffrées : « Ajouter » crée une nouvelle ligne, sans toucher aux autres. */
export function BulletExamples({ onAdd, disabled }: { onAdd: (text: string) => void; disabled: boolean }) {
  const { t } = useTranslation();
  const examples = BULLET_EXAMPLES.map((text, i) => t(`studentCvBuilder.guide.bulletExamples.${i}`, text));
  return (
    <Inspiration title={t('studentCvBuilder.guide.bulletInspiration', 'Exemples de réalisations chiffrées à adapter')}>
      {examples.map((text, i) => (
        <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
          <ExampleText text={text} />
          <button type="button" disabled={disabled} onClick={() => onAdd(text)}
            className={`${smallBtn} bg-[#3f74ff]/10 text-[#3f74ff] dark:text-[#8fb0ff] hover:bg-[#3f74ff]/20 disabled:opacity-50 disabled:cursor-default`}
            aria-label={t('studentCvBuilder.guide.addExampleAria', 'Ajouter cette réalisation : {{text}}', { text: text.replace(/\*\*/g, '') })}>
            <Plus className="h-3 w-3" aria-hidden="true" />{t('studentCvBuilder.guide.add', 'Ajouter')}
          </button>
        </div>
      ))}
    </Inspiration>
  );
}

/**
 * Verbes d'action, proposés quand l'étudiant commence une réalisation (ligne vide en cours de saisie).
 * onMouseDown + preventDefault : le champ garde le focus, on continue d'écrire après le verbe.
 */
export function ActionVerbs({ onPick }: { onPick: (verb: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={t('studentCvBuilder.guide.verbsLabel', 'Verbes d’action')}>
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        {t('studentCvBuilder.guide.verbsIntro', 'Commence par un verbe d’action :')}
      </span>
      {ACTION_VERBS.map((verb) => {
        const label = t(`studentCvBuilder.guide.verbs.${verb}`, verb);
        return (
          <button key={verb} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(label)}
            className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#3f74ff] hover:text-[#3f74ff] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff]">
            {label}
          </button>
        );
      })}
    </div>
  );
}

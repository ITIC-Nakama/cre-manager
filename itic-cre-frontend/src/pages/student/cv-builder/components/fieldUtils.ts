/** Variante compacte de fieldClass (components/basics/fieldStyles) pour un formulaire dense. */
export const compactFieldClass = (hasError = false) =>
  `w-full rounded-xl border-2 bg-slate-50 dark:bg-[#0d0f16] px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400
  focus:bg-white dark:focus:bg-[#0d0f16] focus:outline-none focus:border-[#3f74ff] transition-all duration-200 disabled:opacity-60
  ${hasError ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-slate-100 dark:border-[#333a51] hover:border-slate-200 dark:hover:border-slate-500'}`;

/** Petit identifiant d'entrée (expérience, formation, projet) — repris tel quel par le serveur. */
export function newEntryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

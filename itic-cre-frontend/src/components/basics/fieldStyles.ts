/**
 * Habillage commun des champs de formulaire (input, select, year picker) : meme fond, bordure et
 * arrondi partout, calques sur les valeurs sombres deja forcees par index.css sur les <input type=...>
 * (#0d0f16 / #333a51) pour qu'un champ sans attribut `type` ne se demarque pas.
 */
export const fieldClass = (hasError = false, withIcon = true) =>
  `w-full rounded-xl border-2 bg-slate-50 dark:bg-[#0d0f16] ${withIcon ? 'pl-11' : 'pl-4'} pr-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400
  focus:bg-white dark:focus:bg-[#0d0f16] focus:outline-none focus:border-[#3f74ff] transition-all duration-200 disabled:opacity-60
  ${hasError ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-slate-100 dark:border-[#333a51] hover:border-slate-200 dark:hover:border-slate-500'}`;

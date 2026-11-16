import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  savedAt: string;
  /** Tutoiement pour l'étudiant, vouvoiement pour l'équipe. */
  audience: 'staff' | 'student';
  onRestore: () => void;
  onDiscard: () => void;
}

/** « Reprendre votre brouillon ? » : en haut d'un formulaire rouvert alors qu'un brouillon existe (useFormDraft). */
export default function DraftRestoreBanner({ savedAt, audience, onRestore, onDiscard }: Props) {
  const { t, i18n } = useTranslation();
  const when = new Date(savedAt).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <div role="status" className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
      <History className="hidden sm:block h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1 text-xs text-amber-800 dark:text-amber-200">
        {audience === 'student'
          ? t('drafts.restore_student', { when, defaultValue: 'Reprendre ton brouillon du {{when}} ?' })
          : t('drafts.restore_staff', { when, defaultValue: 'Reprendre votre brouillon du {{when}} ?' })}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onDiscard}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer">
          {t('drafts.discard', 'Ignorer')}
        </button>
        <button type="button" onClick={onRestore}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white cursor-pointer">
          {t('drafts.restore', 'Reprendre')}
        </button>
      </div>
    </div>
  );
}

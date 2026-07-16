import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  fileName: string;
  isUploading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CVReplaceModal({
  isOpen,
  fileName,
  isUploading,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-fadeIn">
        {/* En-tête */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('studentCv.replaceModal.title', 'Remplacer votre CV ?')}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-5 flex flex-col gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('studentCv.replaceModal.body', 'Vous vous apprêtez à téléverser le fichier')}{' '}
            <span className="font-semibold text-slate-800 dark:text-white">{fileName}</span>.
          </p>
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
            {t('studentCv.replaceModal.warning', "Cette action remplacera votre CV actuel, réinitialisera votre statut de validation de CV et remettra les gains d'XP éligibles en jeu pour ce cycle. Vos commentaires précédents seront conservés pour votre information.")}
          </div>
        </div>

        {/* Pied de page */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t('studentCv.replaceModal.cancel', 'Annuler')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
          >
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('studentCv.replaceModal.confirm', 'Remplacer le CV')}
          </button>
        </div>
      </div>
    </div>
  );
}

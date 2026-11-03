import { ArrowRight, FileUp, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  onCreateWithBuilder: () => void;
  onChooseUpload: () => void;
}

/** Premier dépôt : créer son CV avec l'assistant (recommandé) ou déposer un PDF existant. */
export default function CVStartChoice({ onCreateWithBuilder, onChooseUpload }: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={onCreateWithBuilder}
        className="group relative text-left p-6 rounded-2xl border-2 border-[#3f74ff] bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
      >
        <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-[#3f74ff] text-white text-[10px] font-bold uppercase tracking-wider">
          {t('studentCv.start.recommended', 'Recommandé')}
        </span>
        <span className="h-12 w-12 rounded-2xl bg-[#3f74ff]/10 text-[#3f74ff] flex items-center justify-center">
          <Sparkles className="h-6 w-6" />
        </span>
        <span className="text-base font-bold text-slate-900 dark:text-white">
          {t('studentCv.start.builderTitle', 'Créer mon CV avec l’assistant')}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {t('studentCv.start.builderDesc', 'Un formulaire guidé, déjà prérempli avec ton compte et ta formation. Choisis un modèle, vois le résultat en direct et obtiens un PDF propre en 15 minutes.')}
        </span>
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[#3f74ff]">
          {t('studentCv.start.builderCta', 'Commencer')}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </button>

      <button
        type="button"
        onClick={onChooseUpload}
        className="group text-left p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col gap-3"
      >
        <span className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
          <FileUp className="h-6 w-6" />
        </span>
        <span className="text-base font-bold text-slate-900 dark:text-white">
          {t('studentCv.start.uploadTitle', 'Déposer un PDF')}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {t('studentCv.start.uploadDesc', 'Tu as déjà un CV à jour ? Dépose-le tel quel (PDF, 10 Mo maximum).')}
        </span>
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t('studentCv.start.uploadCta', 'Choisir un fichier')}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </button>
    </div>
  );
}

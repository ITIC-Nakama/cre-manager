import { Check, FileText, Search, ShieldCheck, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  currentStep: number; // -1 à 3
}

export default function CycleStrip({ currentStep }: Props) {
  const { t } = useTranslation();

  const steps = [
    { label: t('studentCv.timeline.step0', 'Dépôt du CV'), icon: FileText, desc: t('studentCv.timeline.step0Desc', 'Fichier téléversé') },
    { label: t('studentCv.timeline.step1', 'Relecture conseiller'), icon: Search, desc: t('studentCv.timeline.step1Desc', 'En attente de revue') },
    { label: t('studentCv.timeline.step2', 'Statut attribué'), icon: ShieldCheck, desc: t('studentCv.timeline.step2Desc', 'Décision conseiller') },
    { label: t('studentCv.timeline.step3', 'XP gagnés'), icon: Zap, desc: t('studentCv.timeline.step3Desc', 'Bonus débloqué') },
  ];

  // Centres des cercles : avec 4 colonnes de largeur égale, un cercle centré
  // dans chaque colonne a son centre à 12.5%, 37.5%, 62.5%, 87.5%.
  const N = steps.length;
  const segment = 100 / N; // largeur d'une colonne en %
  const firstCenter = segment / 2; // 12.5%
  const lastCenter = 100 - segment / 2; // 87.5%
  const trackSpan = lastCenter - firstCenter; // 75%

  const progressRatio =
    currentStep === -1 ? 0 : Math.min((currentStep + 1) / N, 1);

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
      {/* Rangée des cercles : hauteur fixe et indépendante des labels,
          donc la ligne reste toujours alignée sur les centres des cercles */}
      <div className="relative flex items-center w-full h-10 sm:h-12">
        {/* Ligne de fond, calée sur le centre du 1er au dernier cercle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0"
          style={{ left: `${firstCenter}%`, right: `${100 - lastCenter}%` }}
        />
        {/* Ligne de progression */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-indigo-600 rounded-full transition-all duration-500 ease-out z-0"
          style={{
            left: `${firstCenter}%`,
            width: `${trackSpan * progressRatio}%`,
          }}
        />

        {/* Cercles, centrés chacun dans leur colonne */}
        {steps.map((step, idx) => {
          const isActive = idx <= currentStep;
          const isCompleted = idx < currentStep || currentStep === 3;
          const Icon = step.icon;

          return (
            <div
              key={idx}
              className="flex items-center justify-center z-10"
              style={{ width: `${segment}%` }}
            >
              <div
                className={`h-9 w-9 sm:h-12 sm:w-12 shrink-0 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : isActive
                    ? 'bg-white dark:bg-slate-900 border-indigo-600 text-indigo-600 ring-4 ring-indigo-50 dark:ring-indigo-950/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" />
                ) : (
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex w-full mt-3">
        {steps.map((step, idx) => {
          const isActive = idx <= currentStep;
          return (
            <div
              key={idx}
              className="text-center px-1"
              style={{ width: `${segment}%` }}
            >
              <p
                className={`text-[11px] sm:text-xs font-semibold tracking-tight transition-colors leading-tight ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {step.label}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block mt-0.5">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
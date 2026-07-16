import { FileText, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import type { CVResponse } from '../../../../types/models/CV';
import { useTranslation } from 'react-i18next';

interface Props {
  cv: CVResponse;
  onReplaceToggle: () => void;
  isReplaceOpen: boolean;
  isUploading: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CVSheet({ cv, onReplaceToggle, isReplaceOpen, isUploading }: Props) {
  const { t } = useTranslation();

  // Extraire le nom du fichier depuis l'URL s'il n'est pas fourni par le backend, en retirant les paramètres de requête S3/R2
  let fileName = cv.nomFichier || cv.url.split('/').pop() || t('studentCv.sheet.fallbackName', 'Mon CV.pdf');
  if (fileName.includes('?')) {
    fileName = fileName.split('?')[0];
  }

  // Si le nom ressemble à un UUID système généré par le backend (ex: UUID-timestamp.pdf), on le remplace par un nom propre convivial
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+\.pdf$/i;
  if (uuidRegex.test(fileName)) {
    fileName = t('studentCv.sheet.fallbackName', 'Mon CV.pdf');
  }

  // L'opacité 0.08 correspond à l'hexadécimal "14" pour la couleur de fond
  const statusColor = cv.statut.couleur || '#6366f1';
  const statusBg = `${statusColor}14`;

  const isUpdated = cv.updatedAt && cv.updatedAt !== cv.uploadedAt;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden">
      {/* Décoration visuelle en arrière-plan */}
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-slate-50 dark:bg-slate-800/20 rounded-full pointer-events-none" />

      {/* En-tête avec les détails du fichier */}
      <div className="flex gap-4 items-start relative z-10">
        <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
          <FileText className="h-7 w-7" />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-white truncate" title={fileName}>
            {fileName}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t('studentCv.sheet.uploadedAt', { date: formatDate(cv.uploadedAt), defaultValue: 'Déposé le {{date}}' })}
            {isUpdated && cv.updatedAt && ` · ${t('studentCv.sheet.updatedAt', { date: formatDate(cv.updatedAt), defaultValue: 'Mis à jour le {{date}}' })}`}
          </p>
        </div>
      </div>

      {/* Section des badges */}
      <div className="flex flex-wrap gap-3 items-center relative z-10">
        {/* Badge de statut style tampon */}
        <span
          className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all transform hover:rotate-1 duration-200"
          style={{
            color: statusColor,
            borderColor: statusColor,
            backgroundColor: statusBg,
          }}
        >
          {cv.statut.nom}
        </span>

        {/* Badge d'XP */}
        {cv.statut.gainXP > 0 && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              cv.xpAwarded
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Zap className={`h-3.5 w-3.5 ${cv.xpAwarded ? 'text-emerald-500 fill-emerald-500' : 'text-slate-400'}`} />
            {cv.xpAwarded
              ? t('studentCv.sheet.xpAwarded', { xp: cv.statut.gainXP, defaultValue: '+{{xp}} XP gagnés' })
              : t('studentCv.sheet.xpToAward', { xp: cv.statut.gainXP, defaultValue: '+{{xp}} XP à la validation' })}
          </span>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex flex-col sm:flex-row gap-2.5 mt-2 relative z-10">
        <a
          href={cv.url}
          target="_blank"
          rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          {t('studentCv.sheet.viewBtn', 'Voir mon CV')}
          <ExternalLink className="h-4 w-4" />
        </a>

        <button
          onClick={onReplaceToggle}
          disabled={isUploading}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 ${
            isReplaceOpen
              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-100/50'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${isUploading ? 'animate-spin' : ''}`} />
          {isReplaceOpen
            ? t('studentCv.sheet.cancelReplaceBtn', 'Annuler le remplacement')
            : t('studentCv.sheet.replaceBtn', 'Remplacer mon CV')}
        </button>
      </div>
    </div>
  );
}

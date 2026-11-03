import { useState } from 'react';
import { useMyCV, useMyComments, useUploadMyCV } from '../../../hooks/useCV';
import CycleStrip from './components/CycleStrip';
import CVSheet from './components/CVSheet';
import CVDropzone from './components/CVDropzone';
import CVComments from './components/CVComments';
import CVReplaceModal from './components/CVReplaceModal';
import CVStartChoice from './components/CVStartChoice';
import { AlertCircle, RefreshCw, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { renderTitleWithGradient } from '../../../utils/titleUtils';

const CV_BUILDER_PATH = '/student/cv/assistant';

export default function StudentCVPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: cv, isLoading: cvLoading, isError, error, refetch } = useMyCV();
  const { data: comments = [] } = useMyComments();
  const uploadMutation = useUploadMyCV();

  // Sans CV : choix entre l'assistant et le dépôt d'un PDF (le dépôt affiche la zone habituelle).
  const [uploadChosen, setUploadChosen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);

  // Vérifier si l'erreur est une 404 (indiquant qu'aucun CV n'a encore été déposé)
  const isNoCV =
    isError &&
    ((error as any).response?.status === 404 ||
      (error as any).statusCode === 404 ||
      (error as any).response?.data?.statusCode === 404);

  const handleUpload = async (file: File) => {
    try {
      await uploadMutation.mutateAsync(file);
      toast.success(t('studentCv.toast.sent', 'CV envoyé au conseiller.'));
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || t('studentCv.toast.errorSend', "Une erreur est survenue lors de l'envoi.");
      toast.error(errMsg);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setIsReplaceModalOpen(true);
  };

  const handleConfirmReplace = async () => {
    if (!selectedFile) return;
    setIsReplaceModalOpen(false);
    try {
      await uploadMutation.mutateAsync(selectedFile);
      toast.success(t('studentCv.toast.replaced', 'CV remplacé — statut réinitialisé.'));
      setIsReplaceOpen(false);
      setSelectedFile(null);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || t('studentCv.toast.errorReplace', "Une erreur est survenue lors du remplacement.");
      toast.error(errMsg);
    }
  };

  // Déterminer l'étape actuelle pour le CycleStrip
  let currentStep = -1;
  if (cv) {
    if (cv.xpAwarded) {
      currentStep = 3;
    } else if (cv.statut && cv.statut.ordre > 1) {
      currentStep = 2;
    } else {
      currentStep = 1;
    }
  }

  // État de chargement
  if (cvLoading) {
    return (
      <div className="flex flex-col gap-8 animate-fadeIn">
        {/* Titre skeleton */}
        <div className="flex flex-col gap-1">
          <div className="h-8 w-56 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-4 w-80 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse mt-1" />
        </div>
        {/* CycleStrip skeleton */}
        <div className="h-14 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        {/* Grille skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="h-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
            <div className="h-40 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
          </div>
          <div className="h-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  // État d'erreur (hors 404)
  if (isError && !isNoCV) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('studentCv.error.title', 'Impossible de charger votre CV')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {t('studentCv.error.desc', 'Une erreur réseau est survenue. Veuillez réessayer.')}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('studentCv.error.retry', 'Réessayer')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8  animate-fadeIn">
      {/* Titre */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <FileText className="h-7 w-7 text-[#E2762F] shrink-0" />
          {renderTitleWithGradient(t('studentCv.title', 'Mon CV Professionnel'), 'itic-gradient-blue')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-1">
          {t('studentCv.subtitle', 'Gérez votre CV et suivez sa validation par votre conseiller.')}
        </p>
      </div>

      {/* Progression du Cycle Strip */}
      <CycleStrip currentStep={currentStep} />

      {/* Grille de contenu principal */}
      {!cv ? (
        /* État A : Aucun CV encore téléversé — assistant (recommandé) ou dépôt d'un PDF */
        <div className="max-w-3xl mx-auto w-full mt-4 flex flex-col gap-4">
          {uploadChosen ? (
            <>
              <button
                onClick={() => setUploadChosen(false)}
                className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('studentCv.start.back', 'Revenir au choix')}
              </button>
              <CVDropzone onFileSelect={handleUpload} isUploading={uploadMutation.isPending} />
            </>
          ) : (
            <CVStartChoice onCreateWithBuilder={() => navigate(CV_BUILDER_PATH)} onChooseUpload={() => setUploadChosen(true)} />
          )}
        </div>
      ) : (
        /* État B : CV téléversé, mise en page sur 2 colonnes */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Colonne de gauche - informations du CV & remplacement */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <CVSheet
              cv={cv}
              onReplaceToggle={() => setIsReplaceOpen(!isReplaceOpen)}
              isReplaceOpen={isReplaceOpen}
              isUploading={uploadMutation.isPending}
              onEditInBuilder={() => navigate(CV_BUILDER_PATH)}
            />

            {isReplaceOpen && (
              <CVDropzone
                onFileSelect={handleFileSelect}
                isUploading={uploadMutation.isPending}
                warningText={t('studentCv.replaceModal.warning', "Cette action remplacera votre CV actuel, réinitialisera votre statut de validation de CV et remettra les gains d'XP éligibles en jeu pour ce cycle. Vos commentaires précédents seront conservés pour votre information.")}
              />
            )}
          </div>

          {/* Colonne de droite - commentaires conseiller */}
          <div className="lg:col-span-1">
            <CVComments comments={comments} />
          </div>
        </div>
      )}

      {/* Modale de confirmation de remplacement */}
      <CVReplaceModal
        isOpen={isReplaceModalOpen}
        fileName={selectedFile?.name || ''}
        isUploading={uploadMutation.isPending}
        onConfirm={handleConfirmReplace}
        onClose={() => {
          setIsReplaceModalOpen(false);
          setSelectedFile(null);
        }}
      />
    </div>
  );
}

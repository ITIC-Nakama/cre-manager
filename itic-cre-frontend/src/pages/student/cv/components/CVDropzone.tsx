import React, { useState, useRef } from 'react';
import { UploadCloud, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  warningText?: string;
}

export default function CVDropzone({ onFileSelect, isUploading, warningText }: Props) {
  const { t } = useTranslation();
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelectFile = (file: File) => {
    setError(null);

    // Valider le type (MIME ou extension)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError(t('studentCv.dropzone.errorPdf', 'Format non supporté. Veuillez déposer un fichier PDF uniquement.'));
      return;
    }

    // Valider la taille (10 Mo = 10 * 1024 * 1024 octets)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(
        t('studentCv.dropzone.errorSize', {
          size: fileSizeMB,
          defaultValue: 'Le fichier est trop volumineux ({{size}} Mo). La taille maximale autorisée est de 10 Mo.'
        })
      );
      return;
    }

    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const triggerInputClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Bannière d'avertissement pour le remplacement */}
      {warningText && (
        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="font-medium leading-relaxed">{warningText}</p>
        </div>
      )}

      {/* Conteneur de la zone de dépôt */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInputClick}
        className={`w-full py-12 px-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer ${
          isUploading
            ? 'border-indigo-300 bg-indigo-50/10 dark:bg-indigo-950/10 cursor-not-allowed pointer-events-none'
            : isDragActive
            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99] ring-4 ring-indigo-50 dark:ring-indigo-950/40'
            : error
            ? 'border-red-300 hover:border-red-400 bg-red-50/5 dark:bg-red-950/5'
            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                {t('studentCv.dropzone.uploading', 'Envoi en cours...')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {t('studentCv.dropzone.doNotClose', 'Ne fermez pas cette page.')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                {t('studentCv.dropzone.dragDrop', 'Glissez-déposez votre CV ici, ou')}{' '}
                <span className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  {t('studentCv.dropzone.browse', 'parcourez vos fichiers')}
                </span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                {t('studentCv.dropzone.pdfOnly', 'Format PDF uniquement · 10 Mo maximum')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alerte d'erreur */}
      {error && !isUploading && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-400 animate-fadeIn">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}
    </div>
  );
}

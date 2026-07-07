import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMyCV, useMyCVComments, useUploadCV, useDeleteCV } from '../../hooks/useStudentCV';
import { UploadCloud, FileText, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import { apiClient } from '../../api-s/AxiosApiClient';

export default function CVPage() {
    const { t } = useTranslation();
    const { data: cv, isLoading: isCvLoading } = useMyCV();
    const { data: comments = [], isLoading: isCommentsLoading } = useMyCVComments();
    const { mutate: uploadCv, isPending: isUploading } = useUploadCV();
    const { mutate: deleteCv, isPending: isDeleting } = useDeleteCV();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        if (cv?.url) {
            apiClient.get(cv.url, { responseType: 'blob' })
                .then(res => {
                    const url = URL.createObjectURL(res.data);
                    setPdfBlobUrl(url);
                })
                .catch(err => console.error("Erreur chargement PDF:", err));
        }
        // Cleanup function for blob URLs
        return () => {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cv?.url]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadCv(file);
        }
        // Reset l'input pour pouvoir re-sélectionner le même fichier si besoin
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (isCvLoading || isCommentsLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const hasCV = !!cv;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Mon CV</h1>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">Statut</p>
                    {cv ? (
                        <div className="flex items-center">
                            <StatusBadge nom={cv.statut.nom} couleur={cv.statut.couleur} />
                        </div>
                    ) : (
                        <span className="text-sm font-semibold text-slate-400">Aucun CV</span>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">Dernier dépôt</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {cv?.uploadedAt
                            ? new Date(cv.uploadedAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                              })
                            : '—'}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">Corrections</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{comments.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column : Aperçu */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Aperçu du CV</h2>
                    </div>
                    <div className="p-5 flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/50 min-h-[500px]">
                        {hasCV ? (
                            pdfBlobUrl ? (
                                <iframe
                                    src={`${pdfBlobUrl}#toolbar=0`}
                                    className="w-full h-[600px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                                    title="Aperçu du CV"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[600px] w-full text-slate-500">
                                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                    <p>Chargement du CV...</p>
                                </div>
                            )
                        ) : (
                            <div className="text-center max-w-sm mx-auto">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 mb-4">
                                    <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Aucun CV déposé
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    Téléversez votre CV au format PDF pour qu'il puisse être évalué par votre conseiller.
                                </p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <UploadCloud className="h-4 w-4" />
                                    )}
                                    Téléverser mon CV
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column : Avis Conseiller & Actions */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Avis conseiller</h2>
                    </div>
                    
                    <div className="p-5 flex-1 overflow-y-auto">
                        {comments.length > 0 ? (
                            <div className="space-y-3">
                                {comments.map((comment) => (
                                    <div
                                        key={comment.id}
                                        className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300"
                                    >
                                        {comment.contenu}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">Aucun retour pour le moment</p>
                            </div>
                        )}
                    </div>

                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 mt-auto flex flex-col gap-3">
                        <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        
                        {hasCV && (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || isDeleting}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <UploadCloud className="h-4 w-4" />
                                    )}
                                    Remplacer le CV
                                </button>
                                <button
                                    onClick={() => deleteCv()}
                                    disabled={isUploading || isDeleting}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-red-600 border border-red-200 dark:border-red-900/50 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                    Supprimer le CV
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

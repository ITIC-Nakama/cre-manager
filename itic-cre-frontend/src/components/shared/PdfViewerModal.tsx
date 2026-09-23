import { useEffect, useState } from 'react';
import { X, Download, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api-s/AxiosApiClient';

interface Props {
    url: string;
    fileName: string;
    title?: string;
    onClose: () => void;
}

export default function PdfViewerModal({ url, fileName, title, onClose }: Props) {
    const { t } = useTranslation();
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | null = null;

        apiClient.get(url, { responseType: 'blob' })
            .then((response) => {
                if (cancelled) return;
                const rawContentType = response.headers['content-type'];
                const contentType = typeof rawContentType === 'string' ? rawContentType : 'application/pdf';
                const blob = new Blob([response.data], { type: contentType });
                objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
            })
            .catch(() => { if (!cancelled) setError(true); });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [url]);

    const handleDownload = () => {
        if (!blobUrl) return;
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{title ?? fileName}</p>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={handleDownload}
                            disabled={!blobUrl}
                            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={t('common.pdf_viewer.download', 'Télécharger')}
                        >
                            <Download className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-950">
                    {error ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                            <AlertTriangle className="h-8 w-8" />
                            <p className="text-sm">{t('common.pdf_viewer.error', 'Impossible de charger le document.')}</p>
                        </div>
                    ) : blobUrl ? (
                        <iframe src={blobUrl} title={fileName} className="w-full h-full border-0" />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

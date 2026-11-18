import { useQuery } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useModalLayer } from '../../../hooks/useModalLayer';
import ProgramView from '../../../components/company/ProgramView';
import { fetchProgramPreview } from '../../../api-s/requests/CompanySpaceRequest';
import type { AdminProgram } from '../../../api-s/requests/CompanySpaceRequest';

/** Aperçu de la page publique d'une formation, telle qu'une entreprise la voit (même masquée ; rien n'est compté). */
export default function ProgramPreviewModal({ program, onClose }: { program: AdminProgram; onClose: () => void }) {
    const { t } = useTranslation();
    useModalLayer();
    const { data, isLoading } = useQuery({
        queryKey: ['company-space', 'preview', program.id],
        queryFn: () => fetchProgramPreview(program.id),
        staleTime: 0,
    });
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/60 animate-fadeIn" role="dialog" aria-modal="true">
            <div className="bg-slate-50 dark:bg-[#020203] w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t('company_admin.preview_title', 'Aperçu : ce que voit une entreprise')}
                        {!program.visible && <span className="ml-2 text-xs text-amber-600">{t('company_admin.preview_hidden', '(formation masquée)')}</span>}
                    </p>
                    <button type="button" onClick={onClose} aria-label={t('company_admin.close', 'Fermer')}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-5 sm:p-8">
                    {isLoading || !data
                        ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                        : <ProgramView page={data} preview />}
                </div>
            </div>
        </div>
    );
}

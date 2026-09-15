import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, MessageCircleWarning, Plus } from 'lucide-react';
import ReclamationModal from './ReclamationModal';
import { HelpFloatingButtonMinimizedStorageKey } from '../../types/storage-keys';

export default function HelpFloatingButton() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(() => {
        try {
            return localStorage.getItem(HelpFloatingButtonMinimizedStorageKey) === 'true';
        } catch {
            return false;
        }
    });

    const toggleMinimized = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMinimized((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(HelpFloatingButtonMinimizedStorageKey, String(next));
            } catch {
                // localStorage indisponible (navigation privée...) — le repli en memoire suffit
            }
            return next;
        });
    };

    return (
        <>
            <div className="fixed bottom-5 right-5 z-40">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label={t('dashboard.reclamations.floating_button', "Contacter l'équipe")}
                    title={t('dashboard.reclamations.floating_button', "Contacter l'équipe")}
                    className={`rounded-full bg-[#E2762F] hover:bg-[#D2651E] text-white shadow-lg shadow-orange-500/30 flex items-center justify-center transition-all cursor-pointer ${
                        minimized ? 'h-7 w-7' : 'h-12 w-12'
                    }`}
                >
                    <MessageCircleWarning className={minimized ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
                </button>
                <button
                    type="button"
                    onClick={toggleMinimized}
                    aria-label={t(minimized ? 'dashboard.reclamations.floating_button_expand' : 'dashboard.reclamations.floating_button_minimize', minimized ? 'Agrandir' : 'Réduire')}
                    title={t(minimized ? 'dashboard.reclamations.floating_button_expand' : 'dashboard.reclamations.floating_button_minimize', minimized ? 'Agrandir' : 'Réduire')}
                    className="absolute -top-1.5 -left-1.5 h-4 w-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white flex items-center justify-center shadow-sm cursor-pointer"
                >
                    {minimized ? <Plus className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                </button>
            </div>

            {open && <ReclamationModal onClose={() => setOpen(false)} />}
        </>
    );
}

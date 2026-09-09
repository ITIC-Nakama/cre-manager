import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircleWarning } from 'lucide-react';
import ReclamationModal from './ReclamationModal';

export default function HelpFloatingButton() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={t('dashboard.reclamations.floating_button', 'Signaler un problème')}
                title={t('dashboard.reclamations.floating_button', 'Signaler un problème')}
                className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-[#E2762F] hover:bg-[#D2651E] text-white shadow-lg shadow-orange-500/30 flex items-center justify-center transition-colors cursor-pointer"
            >
                <MessageCircleWarning className="h-5 w-5" />
            </button>

            {open && <ReclamationModal onClose={() => setOpen(false)} />}
        </>
    );
}

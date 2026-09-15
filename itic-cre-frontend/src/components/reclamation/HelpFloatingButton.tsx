import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, MessageCircleWarning } from 'lucide-react';
import ReclamationModal from './ReclamationModal';

type Side = 'left' | 'right';

const MOVE_THRESHOLD_PX = 6;
const BUTTON_SIZE = 48;
const EDGE_MARGIN = 20;

function clampY(y: number): number {
    return Math.min(Math.max(y, 12), window.innerHeight - BUTTON_SIZE - 12);
}

export default function HelpFloatingButton() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [side, setSide] = useState<Side>('right');
    const [y, setY] = useState(() => window.innerHeight - 68);
    const [reduced, setReduced] = useState(true);
    const [isDragging, setIsDragging] = useState(false);

    const dragStartRef = useRef<{ startX: number; startY: number; startTop: number } | null>(null);
    const didDragRef = useRef(false);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        didDragRef.current = false;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStartRef.current = { startX: e.clientX, startY: e.clientY, startTop: y };
        setIsDragging(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        const start = dragStartRef.current;
        if (!start) return;
        const dx = e.clientX - start.startX;
        const dy = e.clientY - start.startY;
        if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
            didDragRef.current = true;
            setY(clampY(start.startTop + dy));
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        const start = dragStartRef.current;
        dragStartRef.current = null;
        setIsDragging(false);
        if (!start || !didDragRef.current) return;
        if (reduced) return;
        const nextSide: Side = e.clientX < window.innerWidth / 2 ? 'left' : 'right';
        setSide(nextSide);
        setReduced(true);
    };

    const handleClick = () => {
        if (didDragRef.current) {
            didDragRef.current = false;
            return;
        }
        if (reduced) {
            setReduced(false);
            return;
        }
        setOpen(true);
    };

    return (
        <>
            <button
                type="button"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={handleClick}
                style={{ position: 'fixed', top: y, [side]: reduced ? 0 : EDGE_MARGIN, zIndex: 40 }}
                aria-label={t('dashboard.reclamations.floating_button', "Contacter l'équipe")}
                title={t('dashboard.reclamations.floating_button', "Contacter l'équipe")}
                className={`bg-[#E2762F] hover:bg-[#D2651E] text-white shadow-lg shadow-orange-500/30 flex items-center justify-center touch-none cursor-pointer ${
                    isDragging ? '' : 'transition-all duration-200 ease-out'
                } ${
                    reduced
                        ? `h-12 w-6 ${side === 'right' ? 'rounded-l-full' : 'rounded-r-full'}`
                        : 'h-12 w-12 rounded-full'
                }`}
            >
                {reduced ? (
                    side === 'right' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                ) : (
                    <MessageCircleWarning className="h-5 w-5" />
                )}
            </button>

            {open && <ReclamationModal onClose={() => setOpen(false)} />}
        </>
    );
}

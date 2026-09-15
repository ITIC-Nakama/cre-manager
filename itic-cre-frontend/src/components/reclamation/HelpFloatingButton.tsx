import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, MessageCircleWarning } from 'lucide-react';
import ReclamationModal from './ReclamationModal';

type Side = 'left' | 'right';

const MOVE_THRESHOLD_PX = 6;
const BUTTON_SIZE = 56;

function clampY(y: number): number {
    return Math.min(Math.max(y, 12), window.innerHeight - BUTTON_SIZE - 12);
}

export default function HelpFloatingButton() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [side, setSide] = useState<Side>('right');
    const [y, setY] = useState(() => window.innerHeight - 140);
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

    // Le cercle entier (taille constante, jamais de changement de rayon) est positionne a moitie
    // hors-ecran cote bord quand reduit — le bord de la fenetre le decoupe donc naturellement en
    // demi-cercle, sans jamais toucher border-radius. Seule une position (left/right, transform)
    // anime, ce qui evite l'effet d'aplatissement d'un border-radius interpole en meme temps
    // qu'une largeur changeante.
    const edgeClass = side === 'right'
        ? (reduced ? '-right-7 sm:-right-6' : 'right-5')
        : (reduced ? '-left-7 sm:-left-6' : 'left-5');
    const iconShiftClass = reduced
        ? (side === 'right' ? '-translate-x-3.5 sm:-translate-x-3' : 'translate-x-3.5 sm:translate-x-3')
        : 'translate-x-0';

    return (
        <>
            <button
                type="button"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={handleClick}
                style={{ position: 'fixed', top: y, zIndex: 40 }}
                aria-label={t('dashboard.reclamations.floating_button', "Contacter l'équipe")}
                title={t('dashboard.reclamations.floating_button', "Contacter l'équipe")}
                className={`h-14 w-14 sm:h-12 sm:w-12 rounded-full bg-[#E2762F] hover:bg-[#D2651E] text-white shadow-lg shadow-orange-500/30 flex items-center justify-center touch-none cursor-pointer ${
                    isDragging ? '' : 'transition-all duration-200 ease-out'
                } ${edgeClass}`}
            >
                <span className={`flex items-center justify-center transition-transform duration-200 ease-out ${iconShiftClass}`}>
                    {reduced ? (
                        side === 'right' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    ) : (
                        <MessageCircleWarning className="h-6 w-6 sm:h-5 sm:w-5" />
                    )}
                </span>
            </button>

            {open && <ReclamationModal onClose={() => setOpen(false)} />}
        </>
    );
}

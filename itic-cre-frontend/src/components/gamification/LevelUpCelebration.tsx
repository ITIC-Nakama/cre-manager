import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import type { Grade } from '../../types/models/Gamification';

interface LevelUpCelebrationProps {
  grade: Grade;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#3B71FF', '#FFFFFF', '#93C5FD', '#FBBF24', '#FDBA74'];
const AUTO_DISMISS_MS = 7000;

export default function LevelUpCelebration({ grade, onClose }: LevelUpCelebrationProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        delay: Math.random() * 0.5,
        duration: 2.6 + Math.random() * 1.6,
        rounded: Math.random() > 0.5,
      })),
    []
  );

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn cursor-pointer"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c) => (
          <span
            key={c.id}
            className="animate-confetti absolute top-0"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size,
              backgroundColor: c.color,
              borderRadius: c.rounded ? '9999px' : '2px',
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
            }}
          />
        ))}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-pop-in relative flex flex-col items-center gap-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-600 via-primary-500 to-amber-400 px-8 py-10 sm:px-12 sm:py-12 text-center shadow-[0_25px_70px_-15px_rgba(59,113,255,0.55)] max-w-sm w-full cursor-default"
      >
        {/* Halo decoratif */}
        <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-center justify-center h-24 w-24">
          <span className="absolute inset-0 rounded-full bg-white/25 animate-ping" style={{ animationDuration: '1.8s' }} />
          <span className="absolute inset-0 rounded-full bg-white/15 backdrop-blur-sm border border-white/30" />
          <span className="relative text-5xl animate-check-pop">{grade.icone || '🏅'}</span>
        </div>

        <div className="relative flex flex-col items-center gap-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            {t('dashboard.home.gamification.level_up.title', 'Nouveau niveau atteint !')}
          </p>
          <p className="text-2xl font-extrabold text-white text-balance">
            {t('dashboard.home.gamification.level_up.subtitle', { grade: grade.nom, defaultValue: "Tu es maintenant {{grade}}" })}
          </p>
        </div>

        <div className="relative h-1 w-24 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white"
            style={{ animation: `levelUpProgress ${AUTO_DISMISS_MS}ms linear forwards` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

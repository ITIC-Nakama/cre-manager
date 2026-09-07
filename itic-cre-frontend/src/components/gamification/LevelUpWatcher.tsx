import { useEffect, useState } from 'react';
import { usePendingLevelUp } from '../../hooks/useGamification';
import type { Grade } from '../../types/models/Gamification';
import LevelUpCelebration from './LevelUpCelebration';

// Monte une seule fois dans StudentLayout : verifie au chargement s'il y a un passage
// de niveau en attente cote serveur (voir GamificationStudentService.consumePendingLevelUp),
// et re-verifie a chaque invalidation de PENDING_LEVEL_UP_KEY declenchee par les mutations
// qui peuvent attribuer de l'XP (voir useSkills.ts, useCandidatures.ts, useJobOffers.ts).
export default function LevelUpWatcher() {
  const { data } = usePendingLevelUp();
  const [celebrating, setCelebrating] = useState<Grade | null>(null);

  useEffect(() => {
    if (data) setCelebrating(data);
  }, [data]);

  if (!celebrating) return null;

  return <LevelUpCelebration grade={celebrating} onClose={() => setCelebrating(null)} />;
}

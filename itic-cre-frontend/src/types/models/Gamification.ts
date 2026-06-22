export type ActionXP = 'CANDIDATURE_CREATED' | 'CANDIDATURE_STATUS_CHANGED' | 'QUIZ_COMPLETED';

export interface GamificationConfig {
  id: string;
  action: ActionXP;
  valeurXP: number;
  active: boolean;
}

export interface Grade {
  id: string;
  nom: string;
  xpMinimum: number;
  ordre: number;
  icone?: string;
}

/**
 * Interface représentant un paramètre de configuration système backend.
 * (ex: STALE_ALERT_DAYS, PROMOTION_REMINDER_MONTHS)
 */
export interface AppConfiguration {
  id: string;
  key: string;
  value: string;
  description?: string;
}

export interface UpdateAppConfigPayload {
  value: string;
  description?: string;
}

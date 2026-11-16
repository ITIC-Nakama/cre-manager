import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { apiClient } from '../../../api-s/AxiosApiClient';
import { unwrap } from '../../../api-s/unwrap';

/** Abonnements de l'étudiant aux e-mails d'offres (activés par défaut ; un lien de désinscription est dans chaque e-mail). */
export interface EmailPreferences {
  targetedOffers: boolean;
  weeklyDigest: boolean;
}

const KEY = ['me', 'email-preferences'] as const;

/** Profil étudiant : « Offres ciblées du soir » et « Récapitulatif du lundi » (tutoiement). */
export default function EmailPreferencesCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get('/me/email-preferences').then((r) => unwrap<EmailPreferences>(r)),
  });
  const update = useMutation({
    mutationFn: (next: Partial<EmailPreferences>) => apiClient.put('/me/email-preferences', next).then((r) => unwrap<EmailPreferences>(r)),
    onSuccess: (prefs) => {
      queryClient.setQueryData(KEY, prefs);
      toast.success(t('student.email_prefs.saved', 'Préférence enregistrée.'));
    },
    onError: () => toast.error(t('student.email_prefs.error', 'La préférence n’a pas pu être enregistrée.')),
  });

  const rows: { key: keyof EmailPreferences; title: string; subtitle: string }[] = [
    {
      key: 'targetedOffers',
      title: t('student.email_prefs.targeted_title', 'Offres ciblées du soir'),
      subtitle: t('student.email_prefs.targeted_subtitle', 'À 18 h, les offres publiées dans la journée pour ta promotion (tant que tu n’as pas de contrat).'),
    },
    {
      key: 'weeklyDigest',
      title: t('student.email_prefs.weekly_title', 'Récapitulatif du lundi'),
      subtitle: t('student.email_prefs.weekly_subtitle', 'Le lundi à 8 h, jusqu’à 10 nouvelles offres de la semaine proches de ta formation (tant que tu n’as pas de contrat).'),
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('student.email_prefs.title', 'E-mails d’offres')}</h2>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row) => {
          const checked = data ? data[row.key] : true;
          return (
            <label key={row.key} className="flex items-center justify-between gap-4 p-5 cursor-pointer">
              <span className="flex items-center gap-4">
                <span className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                  <Mail className="h-5 w-5" />
                </span>
                <span className="space-y-0.5">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{row.title}</span>
                  <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">{row.subtitle}</span>
                </span>
              </span>
              <input type="checkbox" role="switch" className="h-5 w-5 accent-[#3f74ff] shrink-0 cursor-pointer" checked={checked}
                disabled={!data || update.isPending} onChange={(e) => update.mutate({ [row.key]: e.target.checked })} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

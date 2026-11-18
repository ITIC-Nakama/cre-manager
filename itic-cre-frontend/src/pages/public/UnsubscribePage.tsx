import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, MailX } from 'lucide-react';
import { apiClient } from '../../api-s/AxiosApiClient';

type State = 'pending' | 'done' | 'invalid';

/**
 * Lien « Ne plus recevoir ces e-mails » (sans connexion) : le jeton signé de l'e-mail coupe cet envoi pour cet
 * étudiant. Réactivable à tout moment depuis le profil.
 */
export default function UnsubscribePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>('pending');

  useEffect(() => {
    let cancelled = false;
    apiClient.post('/public/email-preferences/unsubscribe', { token })
      .then(() => { if (!cancelled) setState('done'); })
      .catch(() => { if (!cancelled) setState('invalid'); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020203] p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 text-center space-y-3">
        {state === 'pending' && <Loader2 className="h-8 w-8 mx-auto animate-spin text-slate-400" />}
        {state === 'done' && <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />}
        {state === 'invalid' && <MailX className="h-10 w-10 mx-auto text-rose-500" />}
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          {state === 'done'
            ? t('student.email_prefs.unsubscribed_title', 'C’est noté')
            : state === 'invalid'
              ? t('student.email_prefs.invalid_title', 'Lien non valide')
              : t('student.email_prefs.unsubscribing', 'Désinscription…')}
        </h1>
        {state !== 'pending' && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {state === 'done'
              ? t('student.email_prefs.unsubscribed_text', 'Tu ne recevras plus ces e-mails d’offres. Tu peux les réactiver à tout moment dans ton profil.')
              : t('student.email_prefs.invalid_text', 'Ce lien de désinscription n’est pas valide. Tu peux gérer tes e-mails depuis ton profil.')}
          </p>
        )}
        <Link to="/student/parametres" className="inline-block text-sm font-semibold text-[#3f74ff] hover:underline">
          {t('student.email_prefs.go_profile', 'Gérer mes e-mails')}
        </Link>
      </div>
    </main>
  );
}

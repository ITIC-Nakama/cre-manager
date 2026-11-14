import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, PartyPopper, PenLine, Search, Send, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CvFormSectionKey } from '../../../../types/models/CVBuilder';
import type { PreSendCheck } from './guidance';

const closeBtn = 'p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff]';

/**
 * Accueil à la première visite : un mot d'encouragement et 3 repères. Refermé une fois, il ne revient plus
 * (mémorisé dans le navigateur, par compte).
 */
export function WelcomeCard({ storageKey }: { storageKey: string }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(storageKey) !== '1'; } catch { return true; }
  });
  if (!visible) return null;
  const close = () => {
    try { localStorage.setItem(storageKey, '1'); } catch { /* navigation privée : tant pis, on referme quand même */ }
    setVisible(false);
  };
  const steps = [
    { icon: Search, text: t('studentCvBuilder.welcome.step1', 'Choisis un modèle : tu pourras en changer à tout moment.') },
    { icon: PenLine, text: t('studentCvBuilder.welcome.step2', 'Complète ton CV : il est déjà prérempli avec ton compte et s’enregistre tout seul.') },
    { icon: Send, text: t('studentCvBuilder.welcome.step3', 'Envoie-le à ton conseiller : il le relit et te répond.') },
  ];

  return (
    <section aria-labelledby="cv-welcome-title"
      className="relative flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#3f74ff]/10 to-[#E2762F]/10 border border-[#3f74ff]/25">
      <button type="button" onClick={close} className={`absolute top-3 right-3 ${closeBtn}`}
        aria-label={t('studentCvBuilder.welcome.close', 'Fermer le message d’accueil')}>
        <X className="h-4 w-4" />
      </button>
      <div className="pr-8">
        <h2 id="cv-welcome-title" className="text-base font-bold text-slate-900 dark:text-white">
          {t('studentCvBuilder.welcome.title', 'Ton CV, pas à pas')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          {t('studentCvBuilder.welcome.body', 'Pas besoin de tout savoir avant de commencer : on t’aide à chaque section, avec des exemples. Compte une quinzaine de minutes.')}
        </p>
      </div>
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {steps.map(({ icon: Icon, text }, i) => (
          <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/80 dark:bg-slate-900/70 text-xs text-slate-700 dark:text-slate-200">
            <span className="h-6 w-6 shrink-0 rounded-full bg-[#3f74ff] text-white text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
            <span className="flex-1 leading-snug"><Icon className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-[#3f74ff]" aria-hidden="true" />{text}</span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={close}
        className="self-start px-4 py-2 rounded-xl bg-[#3f74ff] hover:bg-[#2f63ee] text-white text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
        {t('studentCvBuilder.welcome.start', 'C’est parti')}
      </button>
    </section>
  );
}

/** Après l'envoi : ce qui va se passer maintenant (relecture, e-mail, corrections). */
export function SubmittedCard({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  // La page défile dans le conteneur de l'application (pas la fenêtre) : on amène le message à l'écran.
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, []);
  const steps = [
    { icon: Search, text: t('studentCvBuilder.submitted.step1', 'Ton conseiller relit ton CV. Tu suis l’avancement dans la frise en haut de la page.') },
    { icon: Mail, text: t('studentCvBuilder.submitted.step2', 'Tu reçois un e-mail dès qu’il donne son avis (statut ou commentaire).') },
    { icon: PenLine, text: t('studentCvBuilder.submitted.step3', 'S’il te demande des corrections, reviens ici : ton brouillon est gardé, corrige et renvoie.') },
  ];
  return (
    <section ref={ref} role="status" aria-labelledby="cv-submitted-title"
      className="relative scroll-mt-4 flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60">
      <button type="button" onClick={onClose} className={`absolute top-3 right-3 ${closeBtn}`}
        aria-label={t('studentCvBuilder.submitted.close', 'Fermer')}>
        <X className="h-4 w-4" />
      </button>
      <h2 id="cv-submitted-title" className="pr-8 flex items-center gap-2 text-base font-bold text-emerald-800 dark:text-emerald-300">
        <PartyPopper className="h-5 w-5" aria-hidden="true" />
        {t('studentCvBuilder.submitted.title', 'C’est envoyé ! Et maintenant ?')}
      </h2>
      <ol className="flex flex-col gap-2">
        {steps.map(({ icon: Icon, text }, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
            <Icon className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {text}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Liste « avant d'envoyer » dans la confirmation : conseils non bloquants, avec un lien vers le champ. */
export function PreSendChecklist({ checks, onFix }: {
  checks: PreSendCheck[]; onFix: (section: CvFormSectionKey, field: string | null) => void;
}) {
  const { t } = useTranslation();
  const warnings = checks.filter((c) => c.status === 'warn').length;
  return (
    <div className="flex flex-col gap-2 mt-3">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
        {warnings === 0
          ? t('studentCvBuilder.check.allGood', 'Tout est prêt, ton CV peut partir :')
          : t('studentCvBuilder.check.someTips', 'Avant d’envoyer, un coup d’œil (ce sont des conseils, tu peux envoyer quand même) :')}
      </p>
      <ul className="flex flex-col gap-1.5">
        {checks.map((check) => (
          <li key={check.key} className="flex items-start gap-2 text-xs">
            {check.status === 'ok'
              ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label={t('studentCvBuilder.check.ok', 'OK')} />
              : <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-label={t('studentCvBuilder.check.warn', 'À vérifier')} />}
            <span className="flex-1 text-slate-700 dark:text-slate-200">{t(`studentCvBuilder.check.${check.key}`, check.label)}</span>
            {check.status === 'warn' && check.section && (
              <button type="button" onClick={() => check.section && onFix(check.section, check.field)}
                className="shrink-0 font-semibold text-[#3f74ff] dark:text-[#8fb0ff] underline underline-offset-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f74ff] rounded">
                {t('studentCvBuilder.check.fix', 'Corriger')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * « Lisible par les recruteurs » : les modèles produisent toujours du vrai texte, des titres standards et un ordre
 * logique (vérifié par les tests) ; il reste à l'étudiant de donner les coordonnées que les logiciels cherchent.
 */
export function RecruiterReadability({ ready }: { ready: boolean }) {
  const { t } = useTranslation();
  const explain = t('studentCvBuilder.ats.explain', 'Beaucoup d’entreprises trient les CV avec un logiciel. Ton CV est écrit en vrai texte, avec des titres classiques et dans un ordre logique : le logiciel peut le lire comme un recruteur.');
  return ready ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      title={explain}>
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {t('studentCvBuilder.ats.ready', 'Lisible par les recruteurs')}
      <span className="sr-only">. {explain}</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
      title={explain}>
      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
      {t('studentCvBuilder.ats.missingContact', 'Ajoute ton e-mail et ton téléphone pour être bien lu')}
    </span>
  );
}

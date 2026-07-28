import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Vérifier si l'application est lancée en mode autonome ou déjà installée
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      localStorage.getItem('pwa_installed') === 'true' ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // 2. Vérifier si fermé récemment (cooldown 7 jours)
    const dismissedUntil = localStorage.getItem('pwa_banner_dismissed_until');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // 3. Détecter iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDevice);

    if (iosDevice) {
      setShowBanner(true);
    }

    // 4. Écouter le déclenchement natif Chrome / Android / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    // 5. Écouter la confirmation d'installation réussie du navigateur
    const handleAppInstalled = () => {
      localStorage.setItem('pwa_installed', 'true');
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('pwa_banner_dismissed_until', sevenDays.toString());
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-fade-in-up">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 text-white rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-400">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">
                {t('pwa.banner_title', 'Installer ITIC CRE')}
              </h4>
              <p className="text-xs text-slate-300 truncate">
                {t('pwa.banner_subtitle', 'Accès rapide & mode hors-ligne')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('pwa.banner_button', 'Installer')}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showIosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {t('pwa.ios_title', 'Installer sur iPhone')}
              </h3>
              <button
                onClick={() => setShowIosModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <p className="leading-relaxed">
                  Appuyez sur le bouton <strong className="text-slate-900 dark:text-white">Partager</strong>{' '}
                  <Share className="w-4 h-4 inline-block text-indigo-500 mx-0.5" /> en bas de l'écran Safari.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <p className="leading-relaxed">
                  Faites défiler le menu et sélectionnez{' '}
                  <strong className="text-slate-900 dark:text-white">Sur l'écran d'accueil</strong>{' '}
                  <PlusSquare className="w-4 h-4 inline-block text-indigo-500 mx-0.5" />.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              {t('common.confirm_dialog.confirm', 'J\'ai compris')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

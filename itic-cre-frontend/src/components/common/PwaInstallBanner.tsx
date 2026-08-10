import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, MoreVertical, Monitor, DownloadCloud } from 'lucide-react';
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
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // 1. Check if application is already running in standalone mode or installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      localStorage.getItem('pwa_installed') === 'true' ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // 2. Check 7-day dismissal cooldown
    const dismissedUntil = localStorage.getItem('pwa_banner_dismissed_until');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // 3. Detect device type (iOS, Mobile, Desktop PC)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    const mobileDevice = /android|iphone|ipad|ipod|blackberry|windows phone|mobile/.test(userAgent);
    setIsIos(iosDevice);
    setIsDesktop(!mobileDevice);

    setShowBanner(true);

    // 4. Native Chrome / Edge / Desktop prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    // 5. Successful installation listener
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

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          localStorage.setItem('pwa_installed', 'true');
          setShowBanner(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Deferred prompt error:', err);
        if (isDesktop) {
          setShowDesktopModal(true);
        } else {
          setShowAndroidModal(true);
        }
      }
    } else {
      if (isDesktop) {
        setShowDesktopModal(true);
      } else {
        setShowAndroidModal(true);
      }
    }
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
              {isDesktop ? (
                <Monitor className="w-5 h-5 animate-pulse" />
              ) : (
                <Smartphone className="w-5 h-5 animate-pulse" />
              )}
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

      {/* iOS Safari Instruction Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {t('pwa.ios_title', 'Installer sur iPhone / iPad')}
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
                  {t('pwa.ios_step1', 'Appuyez sur le bouton')}{' '}
                  <strong className="text-slate-900 dark:text-white">{t('pwa.ios_step1_share', 'Partager')}</strong>{' '}
                  <Share className="w-4 h-4 inline-block text-indigo-500 mx-0.5" />{' '}
                  {t('pwa.ios_step1_suffix', "en bas de l'écran Safari.")}
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <p className="leading-relaxed">
                  {t('pwa.ios_step2', 'Faites défiler le menu et sélectionnez')}{' '}
                  <strong className="text-slate-900 dark:text-white">{t('pwa.ios_step2_add', "Sur l'écran d'accueil")}</strong>{' '}
                  <PlusSquare className="w-4 h-4 inline-block text-indigo-500 mx-0.5" />.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              {t('pwa.got_it', "J'ai compris")}
            </button>
          </div>
        </div>
      )}

      {/* Android Mobile Instruction Modal */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {t('pwa.android_title', 'Installer sur Android')}
              </h3>
              <button
                onClick={() => setShowAndroidModal(false)}
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
                  {t('pwa.android_step1', 'Ouvrez le menu de votre navigateur')}{' '}
                  <MoreVertical className="w-4 h-4 inline-block text-indigo-500 mx-0.5" />{' '}
                  {t('pwa.android_step1_suffix', '(3 petits points en haut à droite).')}
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <p className="leading-relaxed">
                  {t('pwa.android_step2', 'Appuyez sur')}{' '}
                  <strong className="text-slate-900 dark:text-white">{t('pwa.android_step2_install', "Installer l'application")}</strong>{' '}
                  {t('pwa.android_step2_or', 'ou')}{' '}
                  <strong className="text-slate-900 dark:text-white">{t('pwa.android_step2_add', "Ajouter à l'écran d'accueil")}</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidModal(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              {t('pwa.got_it', "J'ai compris")}
            </button>
          </div>
        </div>
      )}

      {/* Desktop PC / Mac Instruction Modal */}
      {showDesktopModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {t('pwa.desktop_title', 'Installer sur Ordinateur (PC / Mac)')}
              </h3>
              <button
                onClick={() => setShowDesktopModal(false)}
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
                  {t('pwa.desktop_step1', 'Cliquez sur l\'icône d\'installation')}{' '}
                  <DownloadCloud className="w-4 h-4 inline-block text-indigo-500 mx-0.5" />{' '}
                  {t('pwa.desktop_step1_suffix', 'à droite dans la barre d\'adresse de votre navigateur.')}
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <p className="leading-relaxed">
                  {t('pwa.desktop_step2', 'Ou ouvrez le menu de votre navigateur')}{' '}
                  <MoreVertical className="w-4 h-4 inline-block text-indigo-500 mx-0.5" />{' '}
                  {t('pwa.desktop_step2_suffix', '(3 petits points) et cliquez sur')}{' '}
                  <strong className="text-slate-900 dark:text-white">{t('pwa.desktop_step2_install', 'Installer ITIC CRE...')}</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDesktopModal(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              {t('pwa.got_it', "J'ai compris")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

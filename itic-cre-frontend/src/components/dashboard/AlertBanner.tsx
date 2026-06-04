import { AlertCircle, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AlertBanner() {
  const { t } = useTranslation();

  const handleCallEmergency = () => {
    window.location.href = 'tel:15';
  };

  return (
    <div className="bg-red-50/60 dark:bg-red-950/20 border-l-4 border-red-500 border border-y-red-100 border-r-red-100 dark:border-y-red-950/50 dark:border-r-red-950/50 rounded-r-2xl rounded-l-md p-6 shadow-sm flex flex-col md:flex-row items-start gap-4">
      <div className="bg-red-100 dark:bg-red-900/40 p-2.5 rounded-xl text-red-600 dark:text-red-400 shrink-0">
        <AlertCircle className="h-6 w-6 stroke-[2]" />
      </div>
      <div className="space-y-4 flex-1">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-red-900 dark:text-red-200">
            {t('dashboard.home.emergency_banner.title', 'Attention : Situation nécessitant une prise en charge rapide')}
          </h3>
          <p className="text-sm font-medium text-red-700 dark:text-red-300 leading-relaxed max-w-4xl">
            {t('dashboard.home.emergency_banner.description', "D'après vos symptômes, une consultation médicale urgente est recommandée. Ne vous fiez pas uniquement à cette application. En cas de doute ou d'urgence vitale, contactez immédiatement le 15 (SAMU) ou rendez-vous aux urgences.")}
          </p>
        </div>
        <button
          onClick={handleCallEmergency}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold px-5 py-3 rounded-xl shadow-md shadow-red-600/20 hover:shadow-lg transition-all duration-200 cursor-pointer"
        >
          <Phone className="h-4 w-4 fill-white" />
          <span>{t('dashboard.home.emergency_banner.button', 'Appeler le 15')}</span>
        </button>
      </div>
    </div>
  );
}

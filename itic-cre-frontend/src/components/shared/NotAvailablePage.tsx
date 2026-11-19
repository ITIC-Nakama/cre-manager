import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EyeOff } from 'lucide-react';

/** Page neutre « Page non disponible » (lot 10) : Espace entreprise masqué, sans rien révéler de son contenu. */
export default function NotAvailablePage({ fullScreen = true }: { fullScreen?: boolean }) {
    const { t } = useTranslation();
    return (
        <div className={`${fullScreen ? 'min-h-screen' : 'min-h-[50vh]'} flex items-center justify-center bg-slate-50 dark:bg-[#020203] px-4`}>
            <div className="max-w-md text-center space-y-4">
                <EyeOff className="h-10 w-10 mx-auto text-slate-400" aria-hidden="true" />
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('not_available.title', 'Page non disponible')}</h1>
                <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                    {t('not_available.text', 'Cette page n’est pas accessible pour le moment.')}
                </p>
                {fullScreen && (
                    <Link to="/login" className="inline-block text-sm font-semibold text-[#3f74ff] hover:underline">
                        {t('not_available.home', 'Aller à la page de connexion')}
                    </Link>
                )}
            </div>
        </div>
    );
}

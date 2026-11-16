import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useSearchParams } from 'react-router-dom';
import { MapPin, Phone, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logoDark from '../../../assets/itic-paris-logo-dark.svg';
import logoWhite from '../../../assets/itic-paris-logo-white.svg';
import AuthControls from '../../../components/common/AuthControls';
import CompanyRequestModal from '../../../components/company/CompanyRequestModal';
import { rememberCompanySpaceKey } from '../../../api-s/requests/CompanySpaceRequest';
import { useCompanyDirectory } from './useCompanyDirectory';

/** Jamais dans les moteurs de recherche : balise robots « noindex » le temps de la visite. */
function useNoIndex() {
    useEffect(() => {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex, nofollow, noarchive';
        document.head.appendChild(meta);
        const previousTitle = document.title;
        document.title = 'Espace Entreprise · ITIC Paris';
        return () => {
            document.head.removeChild(meta);
            document.title = previousTitle;
        };
    }, []);
}

/** Espace entreprise (public, sans connexion, vouvoiement) : en-tête, contenu, bloc « Un profil vous intéresse ? ». */
export default function CompanyLayout() {
    const { t } = useTranslation();
    const [params] = useSearchParams();
    // Lien privé : la clé de l'adresse est gardée pour la visite (avant toute requête).
    const [ready] = useState(() => {
        rememberCompanySpaceKey(params.get('cle'));
        return true;
    });
    useNoIndex();
    const { data, isError } = useCompanyDirectory();
    const [contactOpen, setContactOpen] = useState(false);
    const texts = data?.texts;

    const navClass = ({ isActive }: { isActive: boolean }) =>
        `px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${isActive
            ? 'bg-[#3f74ff]/10 text-[#3f74ff]'
            : 'text-slate-600 dark:text-[#9aa0a6] hover:bg-slate-100 dark:hover:bg-[#1e2130]'}`;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020203] px-4 py-6 sm:py-8 sm:px-6">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <Link to="/entreprise" className="flex items-center gap-3 shrink-0">
                        <img src={logoDark} alt="ITIC Paris" className="h-9 w-auto dark:hidden" />
                        <img src={logoWhite} alt="ITIC Paris" className="h-9 w-auto hidden dark:block" />
                        <span className="hidden sm:inline text-sm font-bold text-slate-700 dark:text-slate-200 border-l border-slate-300 dark:border-slate-700 pl-3">
                            {texts?.homeTitle ?? t('company.title', 'Espace Entreprise')}
                        </span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <nav className="flex items-center gap-1 bg-white dark:bg-[#15171f] rounded-xl p-1 shadow-sm border border-slate-200/60 dark:border-slate-800">
                            <NavLink to="/entreprise" end className={navClass}>{t('company.nav.home', 'Accueil')}</NavLink>
                            <NavLink to="/entreprise/candidats" className={navClass}>{t('company.nav.candidates', 'Nos candidats')}</NavLink>
                        </nav>
                        <AuthControls className="flex items-center gap-1 bg-white dark:bg-[#15171f] rounded-xl p-1 shadow-sm border border-slate-200/60 dark:border-slate-800" />
                    </div>
                </header>

                <main>
                    {ready && isError ? (
                        <div className="bg-white dark:bg-[#15171f] rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
                            <p className="font-semibold text-slate-800 dark:text-white">{t('company.unavailable_title', 'Page indisponible')}</p>
                            <p className="text-sm text-slate-500 dark:text-[#9aa0a6] mt-1">
                                {t('company.unavailable_text', 'Ce lien n’est pas valide ou a été remplacé. Contactez le Pôle Entreprises d’ITIC Paris.')}
                            </p>
                        </div>
                    ) : <Outlet />}
                </main>

                {texts && (
                    <footer className="bg-white dark:bg-[#15171f] rounded-2xl shadow-xl px-5 py-8 sm:p-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{texts.contactTitle}</h2>
                            {texts.contactText && <p className="text-slate-600 dark:text-[#9aa0a6] max-w-2xl">{texts.contactText}</p>}
                            <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 pt-2 text-sm text-slate-600 dark:text-[#9aa0a6]">
                                {texts.address && (
                                    <span className="flex items-start gap-2 whitespace-pre-line"><MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[#3f74ff]" />{texts.address}</span>
                                )}
                                {texts.phone && (
                                    <a href={`tel:${texts.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:text-[#3f74ff]">
                                        <Phone className="h-4 w-4 shrink-0 text-[#3f74ff]" />{t('company.phone', 'Tél. : {{phone}}', { phone: texts.phone })}
                                    </a>
                                )}
                            </div>
                        </div>
                        <button type="button" onClick={() => setContactOpen(true)}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#3f74ff] text-white font-semibold hover:bg-[#2f63ee] cursor-pointer">
                            <Send className="h-4 w-4" /> {t('company.contact_us', 'Contactez-nous')}
                        </button>
                    </footer>
                )}
            </div>
            {contactOpen && <CompanyRequestModal onClose={() => setContactOpen(false)} />}
        </div>
    );
}

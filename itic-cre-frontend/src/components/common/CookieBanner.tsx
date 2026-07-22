import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Check } from 'lucide-react';

export default function CookieBanner() {
    const [accepted, setAccepted] = useState(true);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent_accepted');
        if (!consent) {
            setAccepted(false);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie_consent_accepted', 'true');
        setAccepted(true);
    };

    if (accepted) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-semibold text-sm">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#3f74ff]">
                            <Cookie className="w-4 h-4" />
                        </div>
                        <span>Gestion des Cookies Essentiels</span>
                    </div>
                    <button
                        onClick={handleAccept}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                        aria-label="Fermer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    ITIC-CRE utilise uniquement des cookies de session strictement nécessaires (authentification sécurisée JWT et choix de la langue). Aucun cookie publicitaire ou traceur tiers n'est utilisé.{' '}
                    <Link to="/privacy" className="text-[#3f74ff] underline hover:text-blue-700 font-medium">
                        En savoir plus
                    </Link>.
                </p>

                <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                        onClick={handleAccept}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#3f74ff] hover:bg-[#2a5de5] text-white transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                        <Check className="w-3.5 h-3.5" />
                        J'ai compris
                    </button>
                </div>
            </div>
        </div>
    );
}

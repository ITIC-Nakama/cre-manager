import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/itic-paris-logo-white.svg';
import Button from '../../components/basics/Button';
import { ArrowRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useLogin } from '../../hooks/useAuth';
import type { LoginDTO } from '../../types/models/Auth';
import { useForm } from 'react-hook-form';
import { handleApiError } from '../../utils/errorHelper';
import { useUserStore } from '../../store/UserStore';
import { toUserProfileDTO } from '../../types/models/User';

export default function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const { mutate, isPending } = useLogin();
    const { register, handleSubmit, setError, watch, formState: { errors } } = useForm();
    const [generalError, setGeneralError] = useState<React.ReactNode | null>(null);

    const setUser = useUserStore((state) => state.setUser);

    const onSubmit = (data: any) => {
        const email = data.email as string;
        const password = data.password as string;

        const loginDto: LoginDTO = {
            email: email,
            password: password
        };

        mutate(loginDto, {
            onSuccess: (data: any) => {
                const rawUser = data.user ?? data;
                const user = toUserProfileDTO(rawUser);
                setUser(user);
                navigate('/dashboard');
            },
            onError: (err: any) => {
                const apiError = err?.response?.data;
                if (apiError && apiError.message === "Email not verified") {
                    setGeneralError(
                        <span>
                            Votre adresse e-mail n'est pas validée.{" "}
                            <Link
                                to={`/verify-email?email=${encodeURIComponent(email)}`}
                                className="underline font-semibold hover:text-red-300 dark:hover:text-red-200"
                            >
                                Cliquez ici pour activer votre compte.
                            </Link>
                        </span>
                    );
                } else {
                    handleApiError(err, setError, setGeneralError, "Identifiants incorrects ou service indisponible.");
                }
            }
        });
    };

    return (

        <div className="flex flex-col gap-6 max-w-md mx-auto w-full items-center justify-center min-h-[85vh] px-4 py-8">
            {/* Header / Logo */}
            <div className="gap-3 mb-2 items-center flex flex-col text-center">
                <img src={logo} alt="Login" className="h-10 w-auto drop-shadow-sm" />
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('auth.login.title')}</h1>
                <span className="text-sm text-slate-500 dark:text-slate-400">{t('auth.login.subtitle')}</span>
            </div>

            {/* Login Card */}
            <div className="shadow-xl rounded-xl w-full bg-white p-8 border border-slate-100 dark:border-slate-800/40 dark:bg-slate-900 dark:shadow-slate-950/40">
                <form className="space-y-5" action="#" method="POST" onSubmit={handleSubmit(onSubmit)}>
                    {generalError && (
                        <div className="flex gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <span>{generalError}</span>
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('auth.login.email_label')}</label>
                        <input
                            id="email"
                            type="email"
                            placeholder={t('auth.login.email_placeholder')}
                            autoComplete="email"
                            disabled={isPending}
                            className={`w-full rounded-lg border px-3.5 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 transition-all duration-150 disabled:opacity-60 ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-slate-200'}`}
                            {...register("email", {
                                required: "L'adresse email est requise.",
                                pattern: {
                                    value: /^\S+@\S+$/i,
                                    message: "Veuillez entrer une adresse e-mail valide."
                                }
                            })}
                        />
                        {errors.email && (
                            <span className="text-red-500 text-xs mt-1 block">
                                {errors.email.message as string}
                            </span>
                        )}
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                        <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('auth.login.password_label')}</label>
                        <div className="relative mt-1">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder={t('auth.login.password_placeholder')}
                                autoComplete="current-password"
                                disabled={isPending}
                                className={`w-full rounded-lg border pl-3.5 pr-10 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 transition-all duration-150 disabled:opacity-60 ${errors.password ? 'border-red-500 focus:ring-red-200' : 'border-slate-200'}`}
                                {...register("password", {
                                    required: "Le mot de passe est requis."
                                })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isPending}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer disabled:opacity-50"
                            >
                                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                            </button>
                        </div>
                        {errors.password && (
                            <span className="text-red-500 text-xs mt-1 block">
                                {errors.password.message as string}
                            </span>
                        )}
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-primary hover:bg-primary-dark text-white py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer justify-center font-medium mt-2 disabled:opacity-60 disabled:cursor-not-allowed w-full flex items-center gap-2"
                    >
                        <span>{isPending ? "Connexion..." : t('auth.login.submit_button')}</span>
                        {!isPending && <ArrowRight className="h-4 w-4" />}
                    </Button>

                    {/* Divider */}
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800"></div>
                        <span className="flex-shrink mx-4 text-xs text-slate-400 dark:text-slate-500">{t('auth.login.or_continue_with')}</span>
                        <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800"></div>
                    </div>

                    {/* Social Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <button type="button" className="flex items-center justify-center py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                            <svg className="h-5 w-5 text-slate-900 dark:text-white fill-current" viewBox="0 0 24 24">
                                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.415 0-6.19-2.775-6.19-6.19s2.775-6.19 6.19-6.19c1.55 0 2.969.577 4.053 1.528l3.102-3.102C19.263 2.107 15.992 1 12.24 1 6.136 1 1.143 5.993 1.143 12s4.993 11 11.097 11c6.36 0 10.574-4.469 10.574-10.772 0-.726-.065-1.428-.188-2.113H12.24z" />
                            </svg>
                        </button>
                        <button type="button" className="flex items-center justify-center py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                            <svg className="h-5 w-5 text-slate-900 dark:text-white fill-current" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.32 3.1 9.94 6.7 9.59c1.32.1 2.22.84 2.87.84.66 0 1.95-.91 3.55-.75 1.63.16 2.84.81 3.5 1.78-3.3 2-2.77 6.8.52 8.12-.66 1.7-1.5 3.37-2.6 4.7M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.26 2.5-2.1 4.42-3.74 4.25" />
                            </svg>
                        </button>
                    </div>

                    {/* Links */}
                    <div className="flex flex-col items-center gap-2 pt-2 text-center">
                        <Link to="/reset-password" className="text-sm text-primary dark:text-primary-400 hover:underline cursor-pointer font-medium">{t('auth.login.forgot_password')}</Link>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{t('auth.login.no_account')}{" "}
                            <Link to="/signup" className="text-primary dark:text-primary-400 hover:underline ps-1 cursor-pointer font-medium">{t('auth.login.register_free')}</Link>
                        </span>
                        <Link
                            to={`/verify-email?email=${encodeURIComponent(watch("email") || '')}`}
                            className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary hover:underline cursor-pointer font-medium mt-1"
                        >
                            Activer mon compte (Code OTP)
                        </Link>
                    </div>
                </form>
            </div>

            {/* Disclaimer / Warning Banner at the bottom */}
            <div className="w-full p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/80 dark:border-amber-900/20 flex gap-3 text-left">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs md:text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong className="font-semibold text-amber-900 dark:text-amber-200">{t('cta.warning_title')}</strong>{" "}
                    {t('cta.warning_text')}
                </p>
            </div>
        </div>
    )
}
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, X, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  pendingEmail: string;
  isConfirming: boolean;
  isResending: boolean;
  onClose: () => void;
  onConfirm: (code: string) => void;
  onResend: () => void;
}

export default function EmailChangeOtpModal({
  isOpen,
  pendingEmail,
  isConfirming,
  isResending,
  onClose,
  onConfirm,
  onResend,
}: Props) {
  const { t } = useTranslation();
  const [otpCode, setOtpCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    onConfirm(otpCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-500" />
            {t('dashboard.parametres.profile.modal_otp_title', "Confirmation de l'adresse e-mail")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('dashboard.parametres.profile.modal_otp_desc', 'Veuillez saisir le code à 6 chiffres envoyé à')}{' '}
          <span className="font-semibold text-slate-900 dark:text-white">{pendingEmail}</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              required
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.trim())}
              placeholder="123456"
              className="w-full text-center tracking-[0.5em] font-mono text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="submit"
              disabled={otpCode.length < 6 || isConfirming}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('dashboard.parametres.profile.btn_confirm_otp', 'Valider le code')}
            </button>

            <button
              type="button"
              onClick={onResend}
              disabled={isResending}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
            >
              {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.otp.resend_btn', 'Renvoyer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

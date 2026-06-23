import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { X, Loader2, Copy, Check, RefreshCw, KeyRound } from 'lucide-react';
import { generatePassword } from '../../../utils/passwordGenerator';
import { copyToClipboard } from '../../../utils/clipboard';
import type { Advisor } from '../../../types/models/Advisor';

interface ResetPasswordModalProps {
  isOpen: boolean;
  advisor?: Advisor;
  saving: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
}

export default function ResetPasswordModal({ isOpen, advisor, saving, onClose, onConfirm }: ResetPasswordModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword(generatePassword());
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen || !advisor) return null;

  const handleRegenerate = () => {
    setPassword(generatePassword());
    setCopied(false);
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(password);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error(t('dashboard.conseillers.toast_copy_error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-500" />
            {t('dashboard.conseillers.modal_reset_password')}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 flex flex-col gap-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.conseillers.reset_password_desc', { name: `${advisor.firstName} ${advisor.lastName}` })}
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_password')}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={password}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm font-mono tracking-wide dark:text-white"
              />
              <button
                type="button"
                onClick={handleCopy}
                disabled={saving}
                title={t('dashboard.conseillers.btn_copy')}
                className="flex-shrink-0 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={saving}
                title={t('dashboard.conseillers.btn_regenerate')}
                className="flex-shrink-0 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">{t('dashboard.conseillers.password_hint')}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-8 pb-8">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('dashboard.conseillers.btn_cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(password)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('dashboard.conseillers.btn_reset_password')}
          </button>
        </div>
      </div>
    </div>
  );
}

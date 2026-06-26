import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { X, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import type { Advisor } from '../../../types/models/Advisor';
import { generatePassword } from '../../../utils/passwordGenerator';
import { copyToClipboard } from '../../../utils/clipboard';

interface AdvisorModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  advisor?: Advisor;
  saving: boolean;
  onClose: () => void;
  onSave: (data: { email: string; firstName: string; lastName: string; password: string; phoneNumber: string; jobTitle: string }) => void;
}

export default function AdvisorModal({ isOpen, mode, advisor, saving, onClose, onSave }: AdvisorModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && advisor) {
        setEmail(advisor.email);
        setFirstName(advisor.firstName);
        setLastName(advisor.lastName);
        setPassword('');
        setPhoneNumber(advisor.phoneNumber || '');
        setJobTitle(advisor.jobTitle || '');
      } else {
        setEmail('');
        setFirstName('');
        setLastName('');
        setPassword(generatePassword());
        setPhoneNumber('');
        setJobTitle('');
      }
      setCopied(false);
    }
  }, [isOpen, mode, advisor]);

  const handleRegeneratePassword = () => {
    setPassword(generatePassword());
    setCopied(false);
  };

  const handleCopyPassword = async () => {
    const success = await copyToClipboard(password);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error(t('dashboard.conseillers.toast_copy_error'));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    onSave({ email, firstName, lastName, password, phoneNumber, jobTitle });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {mode === 'create' ? t('dashboard.conseillers.modal_create') : t('dashboard.conseillers.modal_edit')}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_first_name')} <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                maxLength={50}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_last_name')} <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                maxLength={50}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_email')} <span className="text-rose-500">*</span></label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving || mode === 'edit'}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_password')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={password}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm font-mono tracking-wide dark:text-white disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  disabled={saving}
                  title={t('dashboard.conseillers.btn_copy')}
                  className="flex-shrink-0 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleRegeneratePassword}
                  disabled={saving}
                  title={t('dashboard.conseillers.btn_regenerate')}
                  className="flex-shrink-0 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">{t('dashboard.conseillers.password_hint')}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_phone')}</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+33612345678"
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_job_title')}</label>
              <input
                type="text"
                maxLength={120}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t('dashboard.conseillers.placeholder_job_title')}
                disabled={saving}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-2 pt-6 border-t border-slate-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('dashboard.conseillers.btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('dashboard.conseillers.btn_save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

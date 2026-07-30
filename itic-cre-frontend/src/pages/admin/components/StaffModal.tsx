import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { X, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import type { Advisor } from '../../../types/models/Advisor';
import { generatePassword } from '../../../utils/passwordGenerator';
import { copyToClipboard } from '../../../utils/clipboard';

interface StaffModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  advisor?: Advisor;
  targetRole?: 'ADVISOR' | 'ADMIN';
  saving: boolean;
  onClose: () => void;
  onSave: (data: { email: string; firstName: string; lastName: string; password: string; phoneNumber: string; jobTitle: string }) => void;
}

export default function StaffModal({ isOpen, mode, advisor, targetRole = 'ADVISOR', saving, onClose, onSave }: StaffModalProps) {
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

  const getTitle = () => {
    if (mode === 'edit') return t('dashboard.conseillers.modal_edit');
    return targetRole === 'ADMIN'
      ? t('dashboard.conseillers.modal_create_admin')
      : t('dashboard.conseillers.modal_create_advisor');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {getTitle()}
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
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_last_name')} <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_email')} <span className="text-rose-500">*</span></label>
            <input
              type="email"
              required
              disabled={mode === 'edit'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@iticparis.com"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {mode === 'create' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('dashboard.conseillers.label_password')} <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegeneratePassword}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t('dashboard.conseillers.generate_password')}
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full font-mono tracking-wider pr-10 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title={t('dashboard.conseillers.copy_password')}
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_phone')}</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t('dashboard.conseillers.label_job_title')}</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={targetRole === 'ADMIN' ? 'Directeur Pédagogique' : 'Responsable Relations Entreprises'}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('dashboard.conseillers.button_cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'create' ? t('dashboard.conseillers.button_create') : t('dashboard.conseillers.button_save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

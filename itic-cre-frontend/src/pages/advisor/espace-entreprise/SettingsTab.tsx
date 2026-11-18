import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { fieldClass } from '../../../components/basics/fieldStyles';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import {
    fetchCompanySpaceSettings, regenerateCompanySpaceKey, updateCompanySpaceSettings,
} from '../../../api-s/requests/CompanySpaceRequest';
import type { CompanySpaceSettings } from '../../../api-s/requests/CompanySpaceRequest';
import { getApiErrorMessage } from '../../../utils/errorHelper';
import { SETTINGS_KEY } from './queryKeys';

type TextKey = 'homeTitle' | 'homeIntro' | 'contactTitle' | 'contactText' | 'address' | 'phone' | 'promotionIntro' | 'warningText' | 'notificationEmail';

/** Textes de l'Espace entreprise, adresse prévenue et accès par lien privé (modification : admin). */
export default function SettingsTab({ isAdmin }: { isAdmin: boolean }) {
    const { t } = useTranslation();
    const { data } = useQuery({ queryKey: SETTINGS_KEY, queryFn: fetchCompanySpaceSettings });
    if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
    return <SettingsForm key={data.accessKey + String(data.privateAccess)} initial={data} isAdmin={isAdmin} t={t} />;
}

function SettingsForm({ initial, isAdmin, t }: { initial: CompanySpaceSettings; isAdmin: boolean; t: ReturnType<typeof useTranslation>['t'] }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState(initial);
    const [confirmKey, setConfirmKey] = useState(false);
    const onSaved = (s: CompanySpaceSettings) => {
        queryClient.setQueryData(SETTINGS_KEY, s);
        queryClient.invalidateQueries({ queryKey: ['company-space', 'directory'] });
        toast.success(t('company_admin.saved', 'Enregistré.'));
    };
    const save = useMutation({
        mutationFn: (body: Partial<CompanySpaceSettings>) => updateCompanySpaceSettings(body),
        onSuccess: onSaved,
        onError: (err) => toast.error(getApiErrorMessage(err, t('company_admin.save_error', 'La modification n’a pas pu être enregistrée.'))),
    });
    const regenerate = useMutation({ mutationFn: regenerateCompanySpaceKey, onSuccess: (s) => { setConfirmKey(false); onSaved(s); } });

    const fields: { key: TextKey; label: string; multiline?: boolean; hint?: string }[] = [
        { key: 'homeTitle', label: t('company_admin.settings.home_title', 'Titre de l’accueil') },
        { key: 'homeIntro', label: t('company_admin.settings.home_intro', 'Texte de l’accueil'), multiline: true },
        { key: 'promotionIntro', label: t('company_admin.settings.promotion_intro', 'Texte d’une page de formation'), hint: t('company_admin.settings.promotion_intro_hint', '{formation} est remplacé par le nom de la formation.') },
        { key: 'warningText', label: t('company_admin.settings.warning', 'Avertissement') },
        { key: 'contactTitle', label: t('company_admin.settings.contact_title', 'Titre du bloc contact') },
        { key: 'contactText', label: t('company_admin.settings.contact_text', 'Texte du bloc contact'), multiline: true },
        { key: 'address', label: t('company_admin.settings.address', 'Adresse'), multiline: true },
        { key: 'phone', label: t('company_admin.settings.phone', 'Téléphone') },
        { key: 'notificationEmail', label: t('company_admin.settings.notification_email', 'Adresse prévenue à chaque demande'), hint: t('company_admin.settings.notification_email_hint', 'Vide : seulement le badge du menu.') },
    ];
    const privateLink = `${window.location.origin}/entreprise?cle=${encodeURIComponent(form.accessKey)}`;

    return (
        <div className="space-y-6 max-w-3xl">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4">
                <h2 className="font-bold text-slate-900 dark:text-white">{t('company_admin.settings.texts', 'Textes et contact')}</h2>
                {fields.map((f) => (
                    <label key={f.key} className="block space-y-1.5">
                        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</span>
                        {f.multiline ? (
                            <textarea className={`${fieldClass(false, false)} min-h-20`} value={form[f.key] ?? ''} disabled={!isAdmin}
                                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                        ) : (
                            <input className={fieldClass(false, false)} value={form[f.key] ?? ''} disabled={!isAdmin}
                                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                        )}
                        {f.hint && <span className="block text-xs text-slate-400">{f.hint}</span>}
                    </label>
                ))}
                {isAdmin ? (
                    <button type="button" disabled={save.isPending}
                        onClick={() => save.mutate(Object.fromEntries(fields.map((f) => [f.key, form[f.key] ?? ''])) as Partial<CompanySpaceSettings>)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3f74ff] text-white text-sm font-semibold hover:bg-[#2f63ee] disabled:opacity-50 cursor-pointer">
                        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{t('company_admin.form.save', 'Enregistrer')}
                    </button>
                ) : <p className="text-xs text-slate-400">{t('company_admin.settings.admin_only', 'Modification réservée aux administrateurs.')}</p>}
            </section>

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4">
                <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><KeyRound className="h-4 w-4" />{t('company_admin.settings.private_title', 'Accès par lien privé')}</h2>
                <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                    {t('company_admin.settings.private_text', 'Désactivé : l’Espace entreprise est ouvert à toute personne qui a l’adresse (jamais référencé par les moteurs de recherche). Activé : seules les personnes qui ont le lien avec la clé y accèdent.')}
                </p>
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <input type="checkbox" role="switch" className="h-5 w-5 accent-[#3f74ff]" checked={initial.privateAccess} disabled={!isAdmin || save.isPending}
                        onChange={(e) => save.mutate({ privateAccess: e.target.checked })} />
                    {initial.privateAccess ? t('company_admin.settings.private_on', 'Activé') : t('company_admin.settings.private_off', 'Désactivé')}
                </label>
                {initial.privateAccess && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <input readOnly className={`${fieldClass(false, false)} font-mono text-xs`} value={privateLink} onFocus={(e) => e.target.select()} />
                            <button type="button" title={t('company_admin.programs.copy', 'Copier le lien')}
                                onClick={() => navigator.clipboard.writeText(privateLink).then(() => toast.success(t('company_admin.link_copied', 'Lien copié')))}
                                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#3f74ff] cursor-pointer"><Copy className="h-4 w-4" /></button>
                        </div>
                        {isAdmin && (
                            <button type="button" onClick={() => setConfirmKey(true)} className="text-sm font-semibold text-red-600 hover:text-red-700 cursor-pointer">
                                {t('company_admin.settings.regenerate', 'Générer une nouvelle clé')}
                            </button>
                        )}
                    </div>
                )}
            </section>
            <ConfirmDialog isOpen={confirmKey} title={t('company_admin.settings.regenerate_title', 'Générer une nouvelle clé ?')}
                message={t('company_admin.settings.regenerate_message', 'Les liens déjà envoyés aux entreprises cesseront de fonctionner.')}
                confirmLabel={t('company_admin.settings.regenerate', 'Générer une nouvelle clé')} loading={regenerate.isPending}
                onConfirm={() => regenerate.mutate()} onClose={() => setConfirmKey(false)} />
        </div>
    );
}

import { useState } from 'react';
import { Plus, Pencil, Trash2, Power, PowerOff, Loader2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import ConfirmDialog from './ConfirmDialog';
import TruncatedText from './TruncatedText';
import { useReferenceDataManager, type LabeledReferenceItem } from '../../hooks/useReferenceData';

interface Props {
    basePath: string;
    queryKey: string;
}

export default function ReferenceDataManager({ basePath, queryKey }: Props) {
    const { t } = useTranslation();
    const { list, create, update, remove, deactivate } = useReferenceDataManager(basePath, queryKey);
    const items = list.data ?? [];

    const [adding, setAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newDescription, setNewDescription] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editDescription, setEditDescription] = useState('');

    const [deleteTarget, setDeleteTarget] = useState<LabeledReferenceItem | null>(null);

    const resetAddForm = () => {
        setAdding(false);
        setNewLabel('');
        setNewDescription('');
    };

    const handleCreate = async () => {
        const label = newLabel.trim();
        if (!label) return;
        try {
            await create.mutateAsync({ label, description: newDescription.trim() || undefined });
            toast.success(t('dashboard.offres.categories.toast_created'));
            resetAddForm();
        } catch {
            toast.error(t('dashboard.offres.categories.toast_error'));
        }
    };

    const startEdit = (item: LabeledReferenceItem) => {
        setEditingId(item.id);
        setEditLabel(item.label);
        setEditDescription(item.description ?? '');
    };

    const cancelEdit = () => setEditingId(null);

    const handleUpdate = async (item: LabeledReferenceItem) => {
        const label = editLabel.trim();
        if (!label) return;
        try {
            await update.mutateAsync({
                id: item.id,
                payload: { label, description: editDescription.trim() || undefined, active: item.active },
            });
            toast.success(t('dashboard.offres.categories.toast_updated'));
            setEditingId(null);
        } catch {
            toast.error(t('dashboard.offres.categories.toast_error'));
        }
    };

    const handleToggleActive = async (item: LabeledReferenceItem) => {
        try {
            if (item.active) {
                await deactivate.mutateAsync(item.id);
                toast.success(t('dashboard.offres.categories.toast_deactivated'));
            } else {
                await update.mutateAsync({
                    id: item.id,
                    payload: { label: item.label, description: item.description ?? undefined, active: true },
                });
                toast.success(t('dashboard.offres.categories.toast_activated'));
            }
        } catch {
            toast.error(t('dashboard.offres.categories.toast_error'));
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await remove.mutateAsync(deleteTarget.id);
            toast.success(t('dashboard.offres.categories.toast_deleted'));
            setDeleteTarget(null);
        } catch {
            toast.error(t('dashboard.offres.categories.toast_delete_error'));
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('dashboard.offres.categories.count', { count: items.length })}
                </span>
                {!adding && (
                    <button
                        onClick={() => setAdding(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {t('dashboard.offres.categories.add_button')}
                    </button>
                )}
            </div>

            {adding && (
                <div className="flex flex-wrap items-center gap-2 p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                    <input
                        type="text"
                        autoFocus
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder={t('dashboard.offres.categories.label_placeholder')}
                        maxLength={100}
                        className="flex-1 min-w-40 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                        type="text"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder={t('dashboard.offres.categories.description_placeholder')}
                        maxLength={500}
                        className="flex-[2] min-w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        onClick={handleCreate}
                        disabled={create.isPending || !newLabel.trim()}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {t('dashboard.offres.categories.add_button')}
                    </button>
                    <button
                        onClick={resetAddForm}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-3">{t('dashboard.offres.categories.table_label')}</th>
                            <th className="px-6 py-3">{t('dashboard.offres.categories.table_description')}</th>
                            <th className="px-6 py-3">{t('dashboard.offres.categories.table_status')}</th>
                            <th className="px-6 py-3 text-right">{t('dashboard.offres.categories.table_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {list.isLoading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-12">
                                    <Loader2 className="h-5 w-5 text-slate-400 animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-12 text-slate-400 text-sm">
                                    {t('dashboard.offres.categories.empty')}
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => {
                                const isEditing = editingId === item.id;
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        {isEditing ? (
                                            <>
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={editLabel}
                                                        onChange={(e) => setEditLabel(e.target.value)}
                                                        maxLength={100}
                                                        className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="text"
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        maxLength={500}
                                                        className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                        item.active
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                        {item.active ? t('dashboard.offres.categories.active') : t('dashboard.offres.categories.inactive')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right space-x-1">
                                                    <button
                                                        onClick={() => handleUpdate(item)}
                                                        disabled={update.isPending || !editLabel.trim()}
                                                        className="inline-flex p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer disabled:opacity-50"
                                                        title={t('dashboard.offres.categories.save')}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="inline-flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                        title={t('dashboard.offres.categories.cancel')}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-3 font-semibold text-slate-900 dark:text-white">
                                                    <TruncatedText text={item.label} className="max-w-[220px]" />
                                                </td>
                                                <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                                    {item.description ? (
                                                        <TruncatedText text={item.description} className="max-w-[320px]" />
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                        item.active
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                        {item.active ? t('dashboard.offres.categories.active') : t('dashboard.offres.categories.inactive')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right space-x-1">
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="inline-flex p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                                                        title={t('dashboard.offres.categories.edit')}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(item)}
                                                        className={`inline-flex p-1.5 rounded-lg transition-all cursor-pointer ${
                                                            item.active
                                                                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                                                : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                                        }`}
                                                        title={item.active ? t('dashboard.offres.categories.deactivate') : t('dashboard.offres.categories.activate')}
                                                    >
                                                        {item.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(item)}
                                                        className="inline-flex p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                                                        title={t('dashboard.offres.categories.delete')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title={t('dashboard.offres.categories.confirm_delete_title')}
                message={t('dashboard.offres.categories.confirm_delete_message', { label: deleteTarget?.label ?? '' })}
                loading={remove.isPending}
                onConfirm={handleDelete}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}

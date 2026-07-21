import { useState, useEffect } from 'react';
import { X, FileText, MessageSquare, Send, Loader2, CheckCircle, Clock, AlertTriangle, User, ChevronDown, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCVComments, useUpdateCVStatus, useAddCVComment, useDeleteCVComment } from '../../hooks/useCV';
import { useUserStore } from '../../store/UserStore';
import { Role } from '../../types/models/Auth';
import type { CVRow, CVStatut } from '../../types/models/CV';

interface Props {
    cv: CVRow;
    statuts: CVStatut[];
    onClose: () => void;
}

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function statutIcon(nom: string) {
    if (nom.toLowerCase().includes('valid')) return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (nom.toLowerCase().includes('corriger') || nom.toLowerCase().includes('à corriger')) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <Clock className="h-4 w-4 text-slate-400" />;
}

export default function CVDetailModal({ cv: initialCv, statuts, onClose }: Props) {
    const { t } = useTranslation();
    const [cv, setCv] = useState<CVRow>(initialCv);
    const [newComment, setNewComment] = useState('');
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

    useEffect(() => {
        setCv(initialCv);
    }, [initialCv]);

    const { user } = useUserStore();
    const { data: comments = [], isLoading: commentsLoading } = useCVComments(cv.id);
    const updateStatus = useUpdateCVStatus();
    const addComment = useAddCVComment();
    const deleteComment = useDeleteCVComment();

    const handleStatusChange = async (statut: CVStatut) => {
        setStatusDropdownOpen(false);
        try {
            const updated = await updateStatus.mutateAsync({ cvId: cv.id, statutId: statut.id });
            setCv(updated);
            toast.success(t('dashboard.cv.toast.status_updated', 'Statut mis à jour.'));
        } catch {
            toast.error(t('dashboard.cv.toast.error', 'Une erreur est survenue.'));
        }
    };

    const handleAddComment = async () => {
        const contenu = newComment.trim();
        if (!contenu) return;
        try {
            await addComment.mutateAsync({ cvId: cv.id, contenu });
            setNewComment('');
            toast.success(t('dashboard.cv.toast.comment_added', 'Commentaire ajouté.'));
        } catch {
            toast.error(t('dashboard.cv.toast.error', 'Une erreur est survenue.'));
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await deleteComment.mutateAsync({ cvId: cv.id, commentId });
            toast.success(t('dashboard.cv.toast.comment_deleted', 'Commentaire supprimé.'));
        } catch {
            toast.error(t('dashboard.cv.toast.error', 'Une erreur est survenue.'));
        }
    };

    const currentStatut = cv.statut;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn max-h-[92vh] flex flex-col">

                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-slate-900 dark:text-white">
                                {cv.student
                                    ? `${cv.student.firstName} ${cv.student.lastName}`
                                    : t('dashboard.cv.detail.cv_title', 'CV Étudiant')}
                            </p>
                            {cv.student && (
                                <p className="text-xs text-slate-400">{cv.student.email}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5">

                    {/* Status & Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Current Status + Change */}
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                {t('dashboard.cv.detail.status_label', 'Statut actuel')}
                            </p>
                            <div className="flex items-center gap-2 mb-3">
                                {statutIcon(currentStatut.nom)}
                                <span
                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                                    style={{
                                        background: `${currentStatut.couleur}22`,
                                        color: currentStatut.couleur,
                                        border: `1px solid ${currentStatut.couleur}44`,
                                    }}
                                >
                                    {currentStatut.nom}
                                </span>
                            </div>

                            {/* Status Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setStatusDropdownOpen((o) => !o)}
                                    disabled={updateStatus.isPending}
                                    className="inline-flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60"
                                >
                                    {updateStatus.isPending
                                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('dashboard.cv.detail.updating', 'Mise à jour…')}</>
                                        : <><ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} /> {t('dashboard.cv.detail.change_status', 'Changer le statut')}</>
                                    }
                                </button>
                                {statusDropdownOpen && (
                                    <div className="absolute top-full mt-1 left-0 right-0 z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1.5 flex flex-col gap-1">
                                        {statuts.map((s) => (
                                            <button
                                                key={s.id}
                                                onClick={() => handleStatusChange(s)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                                                    s.id === currentStatut.id
                                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {statutIcon(s.nom)}
                                                {s.nom}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Dates & Download */}
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                {t('dashboard.cv.detail.dates_label', 'Informations')}
                            </p>
                            {cv.student?.promotion && (
                                <div>
                                    <p className="text-xs text-slate-400">{t('dashboard.cv.detail.promotion', 'Promotion')}</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{cv.student.promotion.nom}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-slate-400">{t('dashboard.cv.detail.uploaded_at', 'Déposé le')}</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDateTime(cv.uploadedAt)}</p>
                            </div>
                            {cv.updatedAt && (
                                <div>
                                    <p className="text-xs text-slate-400">{t('dashboard.cv.detail.updated_at', 'Statut mis à jour')}</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDateTime(cv.updatedAt)}</p>
                                </div>
                            )}
                            <a
                                href={cv.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors"
                            >
                                <FileText className="h-3.5 w-3.5" />
                                {t('dashboard.cv.detail.view_pdf', 'Voir le CV (PDF)')}
                            </a>
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {t('dashboard.cv.detail.comments_label', 'Commentaires conseiller')}
                        </p>

                        <div className="space-y-3.5 mb-4 max-h-[350px] overflow-y-auto pr-1">
                            {commentsLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                                </div>
                            ) : comments.length === 0 ? (
                                <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                    {t('dashboard.cv.detail.no_comments', 'Aucun commentaire pour l\'instant.')}
                                </div>
                            ) : (
                                comments.map((c) => {
                                    const isCommentOwner = user && c.advisor && String(c.advisor.id) === String(user.id);
                                    const isUserAdmin = user && user.role === Role.ADMIN;
                                    return (
                                        <div key={c.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-5 animate-fadeIn">
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                                                    <User className="h-4 w-4 text-indigo-500" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                    {c.advisor
                                                        ? `${c.advisor.firstName} ${c.advisor.lastName}`
                                                        : 'Conseiller'}
                                                </span>
                                                <span className="text-sm text-slate-400 ml-auto">{formatDateTime(c.createdAt)}</span>
                                                {(isCommentOwner || isUserAdmin) && (
                                                    <button
                                                        onClick={() => handleDeleteComment(c.id)}
                                                        disabled={deleteComment.isPending}
                                                        className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40 ml-1"
                                                        title={t('dashboard.cv.detail.delete_comment', 'Supprimer le commentaire')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-base text-slate-800 dark:text-slate-200 whitespace-pre-wrap pl-10 leading-relaxed">{c.contenu}</p>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Add Comment */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {t('dashboard.cv.detail.add_comment', 'Ajouter un commentaire')}
                                </label>
                                <span className="text-xs text-slate-400">{newComment.length}/4000</span>
                            </div>
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                maxLength={4000}
                                rows={4}
                                placeholder={t('dashboard.cv.detail.comment_placeholder', 'Votre commentaire pour l\'étudiant…')}
                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3.5 py-3 text-base text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim() || addComment.isPending}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {addComment.isPending
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Send className="h-4 w-4" />
                                    }
                                    {t('dashboard.cv.detail.send_comment', 'Envoyer')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

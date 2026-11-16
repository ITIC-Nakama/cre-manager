import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, SendHorizontal } from 'lucide-react';
import { CONVERSATION_MESSAGE_MAX } from '../../types/models/Conversation';
import { useFormDraft } from '../../hooks/useFormDraft';
import DraftRestoreBanner from '../shared/DraftRestoreBanner';

interface Props {
  placeholder: string;
  sending: boolean;
  /** Envoie le texte ; rejette en cas d'échec (le texte est alors gardé). */
  onSend: (body: string) => Promise<unknown>;
  /** Écriture impossible (compte désactivé) : la raison s'affiche à la place de la zone de saisie. */
  disabledReason?: string | null;
  /** Brouillon dans le navigateur : identifiant du fil (ex. « conversation:moi », « conversation:<étudiant> »). */
  draftKey?: string;
  audience?: 'staff' | 'student';
}

/** Zone de réponse : grandit avec le texte (6 lignes au plus), Ctrl+Entrée ou ⌘+Entrée pour envoyer. */
export default function MessageComposer({ placeholder, sending, onSend, disabledReason, draftKey, audience = 'staff' }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const draft = useFormDraft(draftKey ?? 'conversation', text, '', !!draftKey && !disabledReason);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const tooLong = text.length > CONVERSATION_MESSAGE_MAX;

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  if (disabledReason) {
    return (
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
        {disabledReason}
      </div>
    );
  }

  const send = async () => {
    if (!trimmed || tooLong || sending) return;
    try {
      await onSend(trimmed);
      draft.clear();
      setText('');
      areaRef.current?.focus();
    } catch {
      // Le message d'erreur est affiché par l'appelant ; le texte reste pour réessayer.
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <form className="flex items-end gap-2 px-3 sm:px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      onSubmit={(event) => { event.preventDefault(); void send(); }}>
      <div className="flex-1 min-w-0">
        {draft.pending && (
          <div className="mb-2">
            <DraftRestoreBanner savedAt={draft.pending.savedAt} audience={audience}
              onRestore={() => { const v = draft.restore(); if (v !== null) setText(v); }} onDiscard={draft.discard} />
          </div>
        )}
        <label htmlFor="conversation-composer" className="sr-only">{placeholder}</label>
        <textarea id="conversation-composer" ref={areaRef} rows={1} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown} placeholder={placeholder} maxLength={CONVERSATION_MESSAGE_MAX + 200}
          className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3f74ff]/50" />
        {text.length > CONVERSATION_MESSAGE_MAX - 500 && (
          <p className={`mt-1 text-right text-[11px] ${tooLong ? 'text-rose-600 font-semibold' : 'text-slate-400'}`} aria-live="polite">
            {text.length}/{CONVERSATION_MESSAGE_MAX}
          </p>
        )}
      </div>
      <button type="submit" disabled={!trimmed || tooLong || sending}
        aria-label={t('conversation.common.send', 'Envoyer')}
        title={t('conversation.common.send_hint', 'Envoyer (Ctrl + Entrée)')}
        className="shrink-0 inline-flex items-center justify-center h-10 w-10 sm:w-auto sm:px-4 gap-2 rounded-xl bg-[#3f74ff] hover:bg-[#2f63ee] text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        <span className="hidden sm:inline">{t('conversation.common.send', 'Envoyer')}</span>
      </button>
    </form>
  );
}

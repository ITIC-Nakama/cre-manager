import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extensions';
import { getEmbedUrlFromYoutubeUrl, isValidYoutubeUrl } from '@tiptap/extension-youtube';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Pilcrow,
  List, ListOrdered, Link as LinkIcon, ImagePlus, Video as VideoIcon,
  Eraser, Eye, Edit, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import { AlignedImage } from './tiptap/AlignedImage';
import { Video } from './tiptap/VideoExtension';
import TiptapContentStyles from './tiptap/TiptapContentStyles';

const editorProps = {
  attributes: {
    class: 'ql-editor-replacement',
  },
};

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function UrlPopover({
  label,
  placeholder,
  onSubmit,
  onClose,
}: {
  label: string;
  placeholder: string;
  onSubmit: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (url.trim()) onSubmit(url.trim());
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 z-20 flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2">
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            onClose();
          }
        }}
        placeholder={placeholder}
        className="w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:text-white"
      />
      <button
        type="button"
        onClick={submit}
        className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
      >
        {label}
      </button>
    </div>
  );
}

export default function TiptapEditor({ value, onChange, placeholder, readOnly = false }: TiptapEditorProps) {
  const { t } = useTranslation();
  const [isPreview, setIsPreview] = useState(false);
  const [popover, setPopover] = useState<'link' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSentValueRef = useRef<string>(value);

  const effectiveReadOnly = readOnly || isPreview;
  const placeholderText = placeholder || t('dashboard.formation.placeholder_article_content');

  // useEditor() calls editor.setOptions() whenever this array holds different object
  // references (checked per-item) from the previous render, so it must stay referentially
  // stable instead of being rebuilt inline — otherwise every keystroke (which re-renders
  // this component via onChange) pays for an avoidable options diff + view.setProps() call.
  const extensions = useMemo(
    () => [
      StarterKit,
      AlignedImage,
      Video,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      Placeholder.configure({
        placeholder: placeholderText,
      }),
    ],
    [placeholderText]
  );

  const editor = useEditor({
    extensions,
    content: value || '',
    editable: !effectiveReadOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastSentValueRef.current = html;
      onChange(html);
    },
    editorProps,
  });

  // Sync external value changes (e.g. async article load) without disrupting active typing
  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    if (incoming === lastSentValueRef.current) return;
    if (editor.isFocused) return;
    editor.commands.setContent(incoming, { emitUpdate: false });
    lastSentValueRef.current = incoming;
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!effectiveReadOnly);
  }, [effectiveReadOnly, editor]);

  if (!editor) return null;

  const activeAlign = (): 'left' | 'center' | 'right' => {
    if (editor.isActive('image')) return editor.getAttributes('image').align || 'left';
    if (editor.isActive('video')) return editor.getAttributes('video').align || 'left';
    if (editor.isActive({ textAlign: 'center' })) return 'center';
    if (editor.isActive({ textAlign: 'right' })) return 'right';
    return 'left';
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    if (editor.isActive('image')) editor.chain().focus().updateAttributes('image', { align }).run();
    else if (editor.isActive('video')) editor.chain().focus().updateAttributes('video', { align }).run();
    else editor.chain().focus().setTextAlign(align).run();
  };

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run();
    };
    reader.readAsDataURL(file);
  };

  const insertVideo = (url: string) => {
    const embedUrl = isValidYoutubeUrl(url) ? getEmbedUrlFromYoutubeUrl({ url, allowFullscreen: true }) || url : url;
    editor.commands.setVideo({ src: embedUrl });
  };

  const insertLink = (url: string) => {
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
  };

  return (
    <div className="bg-white text-slate-800 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 flex flex-col h-full min-h-[300px]">
      {!readOnly && (
        <div className="relative flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-slate-200 dark:border-slate-700">
          <ToolbarButton title={t('dashboard.formation.editor.normal')} active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
            <Pilcrow className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title={t('dashboard.formation.editor.heading1')} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title={t('dashboard.formation.editor.heading2')} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title={t('dashboard.formation.editor.heading3')} active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          <ToolbarButton title={t('dashboard.formation.editor.bold')} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title={t('dashboard.formation.editor.italic')} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title={t('dashboard.formation.editor.underline')} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title={t('dashboard.formation.editor.strike')} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          <ToolbarButton title={t('dashboard.formation.editor.bullet_list')} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title={t('dashboard.formation.editor.ordered_list')} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          <div className="relative">
            <ToolbarButton title={t('dashboard.formation.editor.link')} active={editor.isActive('link')} onClick={() => setPopover(popover === 'link' ? null : 'link')}>
              <LinkIcon className="h-4 w-4" />
            </ToolbarButton>
            {popover === 'link' && (
              <UrlPopover
                label={t('dashboard.formation.editor.insert')}
                placeholder={t('dashboard.formation.editor.link_url_placeholder')}
                onSubmit={insertLink}
                onClose={() => setPopover(null)}
              />
            )}
          </div>

          <ToolbarButton title={t('dashboard.formation.editor.image')} onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
              e.target.value = '';
            }}
          />

          <div className="relative">
            <ToolbarButton title={t('dashboard.formation.editor.video')} active={editor.isActive('video')} onClick={() => setPopover(popover === 'video' ? null : 'video')}>
              <VideoIcon className="h-4 w-4" />
            </ToolbarButton>
            {popover === 'video' && (
              <UrlPopover
                label={t('dashboard.formation.editor.insert')}
                placeholder={t('dashboard.formation.editor.video_url_placeholder')}
                onSubmit={insertVideo}
                onClose={() => setPopover(null)}
              />
            )}
          </div>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          <ToolbarButton title={t('dashboard.formation.editor.align_left')} active={activeAlign() === 'left'} onClick={() => setAlign('left')}>
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title={t('dashboard.formation.editor.align_center')} active={activeAlign() === 'center'} onClick={() => setAlign('center')}>
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title={t('dashboard.formation.editor.align_right')} active={activeAlign() === 'right'} onClick={() => setAlign('right')}>
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

          <ToolbarButton title={t('dashboard.formation.editor.clear_formatting')} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
            <Eraser className="h-4 w-4" />
          </ToolbarButton>

          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`ml-auto shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-all duration-200 shadow-sm cursor-pointer ${
              isPreview
                ? 'text-white border-indigo-600 bg-indigo-600 hover:bg-indigo-700'
                : 'text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {isPreview ? (
              <>
                <Edit className="h-3.5 w-3.5" />
                {t('dashboard.formation.btn_edit_content')}
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                {t('dashboard.formation.btn_preview_video')}
              </>
            )}
          </button>
        </div>
      )}

      <style>{`.tiptap-editor-content { flex: 1; overflow-y: auto; min-height: 200px; }`}</style>
      <TiptapContentStyles />

      <EditorContent editor={editor} className="tiptap-editor-content" />
    </div>
  );
}

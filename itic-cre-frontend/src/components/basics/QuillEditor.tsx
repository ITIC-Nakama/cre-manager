import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function QuillEditor({ value, onChange, placeholder = 'Rédigez votre article ici...' }: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear container to avoid duplicate editor instances on hot-reload
    containerRef.current.innerHTML = '';
    const editorDiv = document.createElement('div');
    containerRef.current.appendChild(editorDiv);

    // Initialize Quill
    const quill = new Quill(editorDiv, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image', 'video'],
          ['clean'],
          [{ 'indent': '-1'}, { 'indent': '+1' }], 
        ],
      },
    });

    quillRef.current = quill;

    // Set initial value
    if (value) {
      quill.root.innerHTML = value;
    }

    // Handle text change
    quill.on('text-change', () => {
      if (isUpdatingRef.current) return;
      onChange(quill.root.innerHTML);
    });

    return () => {
      quillRef.current = null;
    };
  }, []);

  // Update value from parent if it changes externally
  useEffect(() => {
    if (quillRef.current) {
      const currentHTML = quillRef.current.root.innerHTML;
      // Compare and set to avoid infinite loops
      if (currentHTML !== value && value !== undefined) {
        isUpdatingRef.current = true;
        quillRef.current.root.innerHTML = value || '';
        isUpdatingRef.current = false;
      }
    }
  }, [value]);

  return (
    <div className="bg-white text-slate-800 rounded-lg border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 quill-editor-wrapper flex flex-col h-full min-h-[300px]">
      <style>{`
        .quill-editor-wrapper .ql-container {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          border: none !important;
          font-family: inherit;
        }
        .quill-editor-wrapper .ql-toolbar {
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          font-family: inherit;
        }
        .dark .quill-editor-wrapper .ql-toolbar {
          border-bottom: 1px solid #334155 !important;
          background-color: #1e293b;
        }
        .quill-editor-wrapper .ql-editor {
          flex: 1;
          overflow-y: auto;
          min-height: 200px;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .dark .quill-editor-wrapper .ql-editor.ql-blank::before {
          color: #64748b;
        }
        .dark .quill-editor-wrapper .ql-snow .ql-stroke {
          stroke: #94a3b8;
        }
        .dark .quill-editor-wrapper .ql-snow .ql-fill {
          fill: #94a3b8;
        }
        .dark .quill-editor-wrapper .ql-snow .ql-picker {
          color: #94a3b8;
        }
        .dark .quill-editor-wrapper .ql-snow .ql-picker-options {
          background-color: #1e293b;
          border-color: #334155;
        }
      `}</style>
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0" />
    </div>
  );
}

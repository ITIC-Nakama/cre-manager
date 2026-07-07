// Shared with TiptapEditor.tsx so read-only renders of `.ql-editor-replacement` HTML
// (e.g. ArticleReaderPage) get the exact same typography/media rules without duplicating them.
export default function TiptapContentStyles() {
  return (
    <style>{`
      .ql-editor-replacement {
        padding: 1rem;
        font-size: 0.875rem;
        line-height: 1.5;
        outline: none;
        min-height: 200px;
      }
      .ql-editor-replacement p.is-editor-empty:first-child::before {
        content: attr(data-placeholder);
        color: #94a3b8;
        float: left;
        height: 0;
        pointer-events: none;
      }
      .ql-editor-replacement h1 { font-size: 1.75em; font-weight: 700; margin: 0.6em 0 0.4em; line-height: 1.25; }
      .ql-editor-replacement h2 { font-size: 1.4em; font-weight: 700; margin: 0.6em 0 0.4em; line-height: 1.3; }
      .ql-editor-replacement h3 { font-size: 1.15em; font-weight: 700; margin: 0.6em 0 0.4em; line-height: 1.35; }
      .ql-editor-replacement p { margin: 0.4em 0; }
      .ql-editor-replacement ul, .ql-editor-replacement ol {
        padding-left: 1.5em;
        margin: 0.4em 0;
      }
      .ql-editor-replacement ul { list-style: disc; }
      .ql-editor-replacement ol { list-style: decimal; }
      .ql-editor-replacement li { margin: 0.15em 0; }
      .ql-editor-replacement a {
        color: #4f46e5;
        text-decoration: underline;
      }
      .dark .ql-editor-replacement a { color: #818cf8; }
      .ql-editor-replacement [data-resize-container] {
        max-width: 100%;
      }
      .ql-editor-replacement [data-resize-container][data-node="image"] img,
      .ql-editor-replacement [data-resize-container][data-node="video"] iframe {
        max-width: 100%;
      }
      .ql-editor-replacement iframe {
        pointer-events: none;
      }
      .ql-editor-replacement[contenteditable="false"] iframe {
        pointer-events: auto;
      }
      .ql-editor-replacement [data-resize-handle] {
        display: none;
        width: 10px;
        height: 10px;
        background: #4f46e5;
        border: 1px solid white;
        border-radius: 2px;
        z-index: 2;
      }
      .ql-editor-replacement [data-resize-wrapper] {
        outline: 2px dashed transparent;
        outline-offset: 2px;
        transition: outline-color 0.1s;
      }
      .ql-editor-replacement .ProseMirror-selectednode [data-resize-handle] {
        display: block;
      }
      .ql-editor-replacement .ProseMirror-selectednode [data-resize-wrapper] {
        outline-color: #4f46e5;
      }
    `}</style>
  );
}

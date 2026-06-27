import { Node, mergeAttributes, ResizableNodeView, type NodeViewRendererProps } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

type Align = 'left' | 'center' | 'right';

function justifyFor(align: Align): string {
  if (align === 'center') return 'center';
  if (align === 'right') return 'flex-end';
  return 'flex-start';
}

export interface VideoOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

// Generic iframe video embed (YouTube, Vimeo, etc.) with drag-resize and left/center/right alignment.
export const Video = Node.create<VideoOptions>({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      width: { default: null },
      height: { default: null },
      align: {
        default: 'left',
        parseHTML: (element) => {
          const attr = element.getAttribute('align');
          if (attr === 'left' || attr === 'center' || attr === 'right') return attr;
          return 'left';
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'iframe[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { frameborder: '0', allowfullscreen: 'true' })];
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: options });
        },
    };
  },

  addNodeView() {
    if (typeof document === 'undefined') return null;

    return ({ node, getPos, HTMLAttributes, editor }: NodeViewRendererProps) => {
      const el = document.createElement('iframe');
      el.frameBorder = '0';
      el.allowFullscreen = true;
      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value == null || key === 'width' || key === 'height' || key === 'align') return;
        el.setAttribute(key, value as string);
      });
      if (mergedAttributes.src != null) {
        el.src = mergedAttributes.src;
      }

      const applyAlign = (align: Align) => {
        nodeView.dom.style.justifyContent = justifyFor(align);
      };

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width: number, height: number) => {
          el.style.width = `${width}px`;
          el.style.height = `${height}px`;
        },
        onCommit: (width: number, height: number) => {
          const pos = getPos();
          if (pos === undefined) return;
          editor.chain().setNodeSelection(pos).updateAttributes(this.name, { width, height }).run();
        },
        onUpdate: (updatedNode: ProseMirrorNode) => {
          if (updatedNode.type !== node.type) return false;
          applyAlign((updatedNode.attrs.align as Align) || 'left');
          return true;
        },
        options: {
          directions: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
          min: { width: 160, height: 90 },
          preserveAspectRatio: false,
        },
      });

      // Percentage widths don't resolve inside ResizableNodeView's flex (shrink-to-fit) wrapper,
      // so newly inserted videos default to a fixed pixel width instead.
      el.style.width = node.attrs.width ? `${node.attrs.width}px` : '640px';
      el.style.height = node.attrs.height ? `${node.attrs.height}px` : 'auto';
      if (!node.attrs.height) el.style.aspectRatio = '16 / 9';

      applyAlign((node.attrs.align as Align) || 'left');

      return nodeView;
    };
  },
});

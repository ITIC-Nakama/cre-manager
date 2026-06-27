import { Image } from '@tiptap/extension-image';
import { mergeAttributes, ResizableNodeView, type NodeViewRendererProps } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

type Align = 'left' | 'center' | 'right';

function justifyFor(align: Align): string {
  if (align === 'center') return 'center';
  if (align === 'right') return 'flex-end';
  return 'flex-start';
}

// Image with drag-resize (via Tiptap's built-in ResizableNodeView) and left/center/right alignment.
export const AlignedImage = Image.extend({
  addOptions() {
    return {
      ...this.parent!(),
      allowBase64: true,
      resize: {
        enabled: true,
        directions: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
        minWidth: 60,
        minHeight: 40,
      },
    };
  },

  addAttributes() {
    return {
      ...this.parent!(),
      align: {
        default: 'left',
        parseHTML: (element) => {
          const attr = element.getAttribute('align');
          if (attr === 'left' || attr === 'center' || attr === 'right') return attr;
          if (element.style.float === 'right' || element.classList.contains('align-right')) return 'right';
          if (element.classList.contains('align-center') || element.style.marginLeft === 'auto') return 'center';
          return 'left';
        },
      },
    };
  },

  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === 'undefined') {
      return null;
    }
    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize;

    return ({ node, getPos, HTMLAttributes, editor }: NodeViewRendererProps) => {
      const el = document.createElement('img');
      el.draggable = false;
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
          directions,
          min: { width: minWidth, height: minHeight },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      });

      applyAlign(node.attrs.align || 'left');

      const dom = nodeView.dom as HTMLElement;
      dom.style.visibility = 'hidden';
      dom.style.pointerEvents = 'none';
      el.onload = () => {
        dom.style.visibility = '';
        dom.style.pointerEvents = '';
      };

      return nodeView;
    };
  },
});

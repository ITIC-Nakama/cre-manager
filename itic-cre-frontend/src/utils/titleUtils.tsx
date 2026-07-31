import type { ReactNode } from 'react';

/**
 * Utility to render a translated title while applying a gradient class to the last word.
 * Maintains full i18n support while enforcing consistent gradient styling.
 */
export function renderTitleWithGradient(
  title: string,
  gradientClass: string = 'itic-gradient-blue'
): ReactNode {
  if (!title) return null;
  const parts = title.trim().split(' ');
  if (parts.length <= 1) {
    return <span className={gradientClass}>{title}</span>;
  }
  const lastWord = parts.pop();
  const prefix = parts.join(' ');
  return (
    <span>
      {prefix} <span className={gradientClass}>{lastWord}</span>
    </span>
  );
}

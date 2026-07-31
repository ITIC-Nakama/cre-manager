import type { ReactNode } from 'react';

export function renderTitleWithGradient(
  title: string,
  gradientClass = 'itic-gradient-blue',
  highlight?: string
): ReactNode {
  if (!title) return null;

  // Si un texte à mettre en avant est fourni
  if (highlight) {
    const index = title.indexOf(highlight);

    if (index !== -1) {
      return (
        <>
          {title.slice(0, index)}
          <span className={gradientClass}>{highlight}</span>
          {title.slice(index + highlight.length)}
        </>
      );
    }
  }

  // dernier mot
  const parts = title.trim().split(' ');
  if (parts.length <= 1) {
    return <span className={gradientClass}>{title}</span>;
  }

  const lastWord = parts.pop();

  return (
    <span>
      {parts.join(' ')}{' '}
      <span className={gradientClass}>{lastWord}</span>
    </span>
  );
}
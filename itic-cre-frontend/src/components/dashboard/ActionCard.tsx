import React from 'react';

interface ActionCardProps {
  title: string;
  description: string;
  onClick: () => void;
  variant: 'primary' | 'secondary';
  icon: React.ComponentType<{ className?: string }>;
  id?: string;
}

export default function ActionCard({
  title,
  description,
  onClick,
  variant,
  icon: Icon,
  id,
}: ActionCardProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      id={id}
      onClick={onClick}
      className={`w-full text-left flex items-center justify-between p-8 rounded-2xl cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
        isPrimary
          ? 'bg-gradient-to-br from-primary-600 to-primary-800 dark:from-primary-800 dark:to-slate-950 text-white'
          : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white'
      }`}
    >
      <div className="space-y-2 pr-4 max-w-[75%]">
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        <p
          className={`text-sm leading-relaxed ${
            isPrimary ? 'text-blue-100/90' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {description}
        </p>
      </div>

      <div
        className={`h-14 w-14 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 ${
          isPrimary
            ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
            : 'bg-primary-50 dark:bg-primary-950/40 text-primary-500 dark:text-primary-400 group-hover:bg-primary-100'
        }`}
      >
        <Icon className="h-6 w-6 stroke-[2]" />
      </div>
    </button>
  );
}

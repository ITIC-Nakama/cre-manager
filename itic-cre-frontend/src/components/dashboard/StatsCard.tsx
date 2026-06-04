import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: string;
  subtext: string;
  trendColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconColorClass: string;
}

export default function StatsCard({
  label,
  value,
  trend,
  subtext,
  trendColor = 'text-green-500',
  icon: Icon,
  iconBgClass,
  iconColorClass,
}: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-400 dark:text-slate-500">{label}</span>
        <div className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</div>
        <div className="text-xs flex items-center pt-1">
          {trend && <span className={`${trendColor} font-bold mr-1.5`}>{trend}</span>}
          <span className="text-slate-500 dark:text-slate-400">{subtext}</span>
        </div>
      </div>
      <div className="mt-5">
        <div className={`inline-flex items-center justify-center p-3 rounded-xl ${iconBgClass}`}>
          <Icon className={`h-6 w-6 ${iconColorClass}`} />
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive,
  color = 'blue',
  onClick,
}) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50/70 text-blue-600 border-blue-100',
      border: 'hover:border-blue-300',
    },
    emerald: {
      bg: 'bg-emerald-50/70 text-emerald-600 border-emerald-100',
      border: 'hover:border-emerald-300',
    },
    amber: {
      bg: 'bg-amber-50/70 text-amber-600 border-amber-100',
      border: 'hover:border-amber-300',
    },
    purple: {
      bg: 'bg-purple-50/70 text-purple-600 border-purple-100',
      border: 'hover:border-purple-300',
    },
    rose: {
      bg: 'bg-rose-50/70 text-rose-600 border-rose-100',
      border: 'hover:border-rose-300',
    },
    cyan: {
      bg: 'bg-cyan-50/70 text-cyan-600 border-cyan-100',
      border: 'hover:border-cyan-300',
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm transition-all duration-200 ${
        onClick ? `cursor-pointer hover:shadow-md ${scheme.border}` : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${scheme.bg}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`font-semibold px-2 py-0.5 rounded-full ${
                trendPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {trend}
            </span>
          )}
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

import React from 'react';

export function Badge({ children, variant = 'neutral', size = 'sm', className = '' }) {
  const variantStyles = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    emergency: 'bg-red-100 text-red-700 border-red-300 font-bold animate-pulse',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };

  const sizeStyles = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs font-semibold',
    md: 'px-3 py-1.5 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles[variant] || variantStyles.neutral} ${sizeStyles[size] || sizeStyles.sm} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'completed' || s === 'active' || s === 'resolved' || s === 'matched' || s === 'paid') {
    return <Badge variant="success">{status}</Badge>;
  }
  if (s === 'pending' || s === 'requested' || s === 'under_review' || s === 'submitted' || s === 'manual_review_needed') {
    return <Badge variant="warning">{status}</Badge>;
  }
  if (s === 'accepted' || s === 'in_progress' || s === 'arriving') {
    return <Badge variant="primary">{status}</Badge>;
  }
  if (s === 'rejected' || s === 'cancelled' || s === 'mismatch' || s === 'suspended' || s === 'unassigned') {
    return <Badge variant="danger">{status}</Badge>;
  }
  if (s === 'dismissed' || s === 'none') {
    return <Badge variant="neutral">{status}</Badge>;
  }
  return <Badge variant="neutral">{status}</Badge>;
}

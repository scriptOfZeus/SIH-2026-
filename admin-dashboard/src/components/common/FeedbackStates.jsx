import React from 'react';
import { Loader2, AlertCircle, FolderSearch, RefreshCw } from 'lucide-react';

export function LoadingSpinner({ text = 'Loading data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Loader2 className="w-9 h-9 animate-spin text-blue-600 mb-3" />
      <p className="text-sm font-medium text-slate-600">{text}</p>
    </div>
  );
}

export function EmptyState({
  title = 'No records found',
  description = 'There is currently no data to display.',
  icon: Icon = FolderSearch,
  actionText,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 my-4">
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-slate-400 mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h4 className="text-base font-bold text-slate-800 mb-1">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mb-5">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the backend.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center border border-rose-200 rounded-2xl bg-rose-50/40 my-4">
      <div className="p-3 rounded-xl bg-rose-100 text-rose-600 mb-3">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h4 className="text-base font-bold text-rose-900 mb-1">{title}</h4>
      <p className="text-sm text-rose-700 max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      )}
    </div>
  );
}

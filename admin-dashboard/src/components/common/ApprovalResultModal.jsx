import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Building2,
  FileCheck2,
  UserCheck,
  Sparkles,
  X,
  FileText,
} from 'lucide-react';
import { Modal } from './Modal';

export function ApprovalResultModal({ isOpen, onClose, result }) {
  if (!result) return null;

  const isApproved = result.decision === 'approved';
  const isRejected = result.decision === 'rejected';
  const isManualReview = result.decision === 'manual_review';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-6 text-slate-800">
        {/* Banner Header */}
        <div
          className={`p-5 rounded-2xl border flex items-start gap-4 ${
            isApproved
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : isRejected
              ? 'bg-rose-50/80 border-rose-200 text-rose-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              isApproved
                ? 'bg-emerald-600 text-white'
                : isRejected
                ? 'bg-rose-600 text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {isApproved ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : isRejected ? (
              <XCircle className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1">
            <span
              className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isApproved
                  ? 'bg-emerald-200/60 text-emerald-900'
                  : isRejected
                  ? 'bg-rose-200/60 text-rose-900'
                  : 'bg-amber-200/60 text-amber-900'
              }`}
            >
              {isApproved ? 'Adjudication Confirmed' : isRejected ? 'Application Rejected' : 'Review Requested'}
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">
              {isApproved
                ? 'Certificate Approved'
                : isRejected
                ? 'Certificate Rejected'
                : 'Manual Review Requested'}
            </h3>
            <p className="text-xs text-slate-600">
              {isApproved
                ? 'The worker credentials have been verified and recorded in the database.'
                : isRejected
                ? 'The worker certificate was rejected. Dispatch access remains restricted.'
                : 'The certificate requires additional documentation or supervisor audit.'}
            </p>
          </div>
        </div>

        {/* Structured Adjudication Summary Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 divide-y divide-slate-200/60 text-xs">
          {/* Worker Info */}
          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Worker Partner:</span>
            <span className="font-extrabold text-slate-900 text-sm">{result.workerName}</span>
          </div>

          {/* Skill & Certificate */}
          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Skill / Trade:</span>
            <span className="font-bold text-slate-800 capitalize">{result.skillCategory}</span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Certificate Number:</span>
            <span className="font-mono font-bold text-slate-800">{result.certificateNumber || 'N/A'}</span>
          </div>

          {/* Stage 1: Automated OCR Result */}
          <div className="p-3.5 flex items-center justify-between bg-white/60">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Automated Certificate Analysis:</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                result.ocrStatus === 'matched'
                  ? 'bg-emerald-100 text-emerald-800'
                  : result.ocrStatus === 'mismatch'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {result.ocrStatus ? result.ocrStatus.replace('_', ' ').toUpperCase() : 'PENDING'}
            </span>
          </div>

          {/* Stage 2: Final Human Verification */}
          <div className="p-3.5 flex items-center justify-between bg-white/60">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Final Human Verification:</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                isApproved
                  ? 'bg-emerald-600 text-white'
                  : isRejected
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {result.finalStatus}
            </span>
          </div>

          {/* Adjudicated By */}
          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Verified / Adjudicated By:</span>
            <span className="font-bold text-slate-700">{result.verifiedBy}</span>
          </div>

          {/* Adjudication Notes */}
          {result.notes && (
            <div className="p-3.5 space-y-1">
              <span className="text-slate-500 font-semibold">Verification Notes / Remarks:</span>
              <p className="text-slate-800 italic bg-white p-2.5 rounded-xl border border-slate-200">
                "{result.notes}"
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
          >
            Close & Return to Queue
          </button>
        </div>
      </div>
    </Modal>
  );
}

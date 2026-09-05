import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  AlertTriangle,
  FileCheck2,
  RefreshCw,
  Search,
  Building2,
  UserCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { workersApi } from '../api/workers';
import { useAuth } from '../context/AuthContext';
import { ApprovalResultModal } from '../components/common/ApprovalResultModal';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { useToast } from '../context/ToastContext';

export function WorkerVerification() {
  const { isSuperAdmin, admin } = useAuth();
  const { success, error, warning } = useToast();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [approvalResult, setApprovalResult] = useState(null);
  const [base64File, setBase64File] = useState('');
  const [mimeType, setMimeType] = useState('image/png');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [adjudicationNotes, setAdjudicationNotes] = useState('');

  const loadPendingWorkers = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const data = await workersApi.getWorkers();
      const list = Array.isArray(data) ? data : [];
      setWorkers(list.filter((w) => w.certificate_document_url || w.verification_status === 'pending' || w.final_verification_status === 'pending'));
    } catch (err) {
      setErrorState(err.message || 'Failed to fetch verification queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingWorkers();
  }, []);

  const handleVerifyCertificate = async (workerId, decision = 'approved', overrideMismatch = false) => {
    setIsProcessing(true);
    try {
      const updated = await workersApi.verifyCertificate(workerId, overrideMismatch, {
        decision,
        notes: adjudicationNotes,
      });

      const finalStatus = decision.toUpperCase();
      setApprovalResult({
        decision,
        workerName: selectedWorker?.full_name || updated?.full_name || 'Worker Partner',
        certificateNumber: selectedWorker?.skill_certificate_number || updated?.skill_certificate_number || 'N/A',
        skillCategory: selectedWorker?.skill_category || updated?.skill_category || 'N/A',
        ocrStatus: selectedWorker?.ocr_status || updated?.ocr_status || 'matched',
        finalStatus,
        verifiedBy: admin?.full_name || admin?.email || 'Supervising Admin',
        notes: adjudicationNotes || (decision === 'approved' ? 'Certificate verified and validated against repository records.' : 'Adjudication updated.'),
        worker: updated,
      });

      success(`Certificate marked as ${finalStatus}`);
      await loadPendingWorkers();
      if (selectedWorker?.id === workerId) {
        setSelectedWorker(updated || ((prev) => (prev ? {
          ...prev,
          final_verification_status: decision,
          skill_certificate_verified: decision === 'approved' ? 1 : 0,
        } : null)));
      }
      setAdjudicationNotes('');
    } catch (err) {
      error(err.message || 'Failed to verify certificate');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveWorker = async (workerId) => {
    setIsProcessing(true);
    try {
      await workersApi.setVerificationStatus(workerId, 'approved', adjudicationNotes);
      success('Worker partner approved and activated for dispatch');
      setSelectedWorker(null);
      await loadPendingWorkers();
      setAdjudicationNotes('');
    } catch (err) {
      error(err.message || 'Failed to approve worker');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectWorker = async (workerId) => {
    setIsProcessing(true);
    try {
      await workersApi.setVerificationStatus(workerId, 'rejected', adjudicationNotes);
      warning('Worker application marked as rejected');
      setSelectedWorker(null);
      await loadPendingWorkers();
      setAdjudicationNotes('');
    } catch (err) {
      error(err.message || 'Failed to reject worker');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setMimeType(file.type || 'image/png');

    const reader = new FileReader();
    reader.onload = () => {
      setBase64File(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCertificate = async (e) => {
    e.preventDefault();
    if (!selectedWorker || !base64File) {
      error('Please select a certificate document to upload');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await workersApi.uploadAndVerifyCertificate(selectedWorker.id, {
        document_base64: base64File,
        mime_type: mimeType,
        filename: fileName,
      });

      const ocrStatus = result?.ocr_verification?.ocr_status || result?.worker?.ocr_status || 'matched';
      success(`OCR Processed: Status is ${ocrStatus}`);
      setIsUploadModalOpen(false);
      setBase64File('');
      setFileName('');
      await loadPendingWorkers();
      if (result?.worker) {
        setSelectedWorker(result.worker);
      }
    } catch (err) {
      error(err.message || 'Failed to process and OCR verify certificate');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <LoadingSpinner text="Scanning OCR verification queue..." />;
  if (errorState) return <ErrorState message={errorState} onRetry={loadPendingWorkers} />;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-black uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> Two-Stage Quality Assurance
          </div>
          <h3 className="text-xl font-bold text-slate-900">Worker Verification & OCR Queue</h3>
          <p className="text-xs text-slate-500">
            Automated certificate scanning, fuzzy validation, and centralized Supervising Admin human adjudication ({workers.length} in queue)
          </p>
        </div>

        <button
          onClick={loadPendingWorkers}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Queue
        </button>
      </div>

      {workers.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="Verification Queue Empty"
          description="All worker certificates in this scope are currently verified and adjudicated."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workers.map((w) => {
            const isOcrMismatch = w.ocr_status === 'mismatch';
            const isOcrMatched = w.ocr_status === 'matched';
            const isManualReview = w.ocr_status === 'manual_review_needed';
            const isFinalApproved = w.final_verification_status === 'approved' || w.skill_certificate_verified === 1;

            return (
              <div
                key={w.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">{w.full_name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            w.worker_type === 'independent'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {w.worker_type === 'independent' ? 'Independent' : 'Federation'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{w.phone}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        isFinalApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : w.final_verification_status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isFinalApproved ? 'Verified' : w.final_verification_status || 'Pending'}
                    </span>
                  </div>

                  {/* Federation Badge */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{w.federation_name || (w.worker_type === 'independent' ? 'Direct Platform Partner' : 'Pilot Federation')}</span>
                  </div>

                  {/* Skill & Cert Info */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Skill Category:</span>
                      <span className="font-semibold capitalize text-slate-800">{w.skill_category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Certificate No:</span>
                      <span className="font-mono font-bold text-slate-800">{w.skill_certificate_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400">OCR Analysis:</span>
                      <span
                        className={`font-semibold ${
                          isOcrMatched
                            ? 'text-emerald-700 font-bold'
                            : isOcrMismatch
                            ? 'text-rose-700 font-bold'
                            : isManualReview
                            ? 'text-amber-700 font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        {w.ocr_status || 'pending'}
                      </span>
                    </div>
                    {w.ocr_extracted_name && (
                      <div className="flex justify-between items-center text-[11px] pt-1">
                        <span className="text-slate-400">Extracted Name:</span>
                        <span className="font-semibold text-slate-700 truncate max-w-[140px]">{w.ocr_extracted_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedWorker(w);
                      setIsUploadModalOpen(true);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    {w.certificate_document_url ? 'Re-upload' : 'Upload Cert'}
                  </button>

                  <button
                    onClick={() => setSelectedWorker(w)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Inspect & Adjudicate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect & Adjudicate Modal */}
      {selectedWorker && !isUploadModalOpen && (
        <Modal
          isOpen={!!selectedWorker}
          onClose={() => setSelectedWorker(null)}
          title={`Adjudication: ${selectedWorker.full_name}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            {/* Header info bar */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Worker Profile</p>
                <h4 className="text-base font-extrabold text-slate-900">{selectedWorker.full_name}</h4>
                <p className="text-xs text-slate-500">Phone: {selectedWorker.phone} | Category: {selectedWorker.skill_category}</p>
              </div>
              <div className="text-right">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    selectedWorker.skill_certificate_verified === 1 || selectedWorker.final_verification_status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedWorker.final_verification_status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Final Status: {selectedWorker.final_verification_status || 'pending'}
                </span>
              </div>
            </div>

            {/* Two-Stage Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stage 1: Automated OCR Analysis */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h5 className="text-xs font-black text-slate-800 uppercase">Stage 1: Automated OCR Analysis</h5>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">OCR Status:</span>
                    <span className="font-extrabold capitalize text-slate-800">{selectedWorker.ocr_status || 'Pending OCR'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Extracted Name:</span>
                    <span className="font-bold text-slate-800">{selectedWorker.ocr_extracted_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Extracted Number:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedWorker.ocr_extracted_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Job Role / Trade:</span>
                    <span className="font-semibold text-slate-800">{selectedWorker.ocr_job_role || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">NSQF Level / Grade:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedWorker.ocr_nsqf_level ? `Level ${selectedWorker.ocr_nsqf_level}` : 'N/A'} {selectedWorker.ocr_grade ? `(Grade ${selectedWorker.ocr_grade})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Confidence Score:</span>
                    <span className="font-bold text-indigo-700">
                      {selectedWorker.ocr_confidence_score ? `${(selectedWorker.ocr_confidence_score * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stage 2: Final Human Adjudication */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <h5 className="text-xs font-black text-slate-800 uppercase">Stage 2: Final Human Adjudication</h5>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Human Verification:</span>
                    <span className="font-extrabold capitalize text-slate-800">
                      {selectedWorker.final_verification_status || 'Pending Review'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Authorized Authority:</span>
                    <span className="font-semibold text-slate-800">Supervising Admin</span>
                  </div>
                  {selectedWorker.final_adjudicated_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Adjudicated At:</span>
                      <span className="font-semibold text-slate-700">
                        {new Date(selectedWorker.final_adjudicated_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedWorker.final_adjudication_notes && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Notes:</p>
                      <p className="text-slate-700 italic">{selectedWorker.final_adjudication_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Adjudication Controls (Supervising Admin vs Federation Admin) */}
            {isSuperAdmin ? (
              <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <label className="block text-xs font-extrabold text-indigo-900 uppercase">
                  Supervising Admin Adjudication Decision
                </label>
                <input
                  type="text"
                  placeholder="Optional adjudication remarks or compliance notes..."
                  value={adjudicationNotes}
                  onChange={(e) => setAdjudicationNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-indigo-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleVerifyCertificate(selectedWorker.id, 'approved', true)}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve Certificate
                  </button>

                  <button
                    onClick={() => handleVerifyCertificate(selectedWorker.id, 'manual_review', false)}
                    disabled={isProcessing}
                    className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-4 h-4" /> Request Review
                  </button>

                  <button
                    onClick={() => handleVerifyCertificate(selectedWorker.id, 'rejected', false)}
                    disabled={isProcessing}
                    className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Federation Admin Notice:</strong> Certificate OCR scanning is complete. Final human verification and approval authority is centrally restricted to the <strong>Supervising Admin</strong>.
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Upload Certificate Modal */}
      {isUploadModalOpen && selectedWorker && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title={`Upload Skill Certificate: ${selectedWorker.full_name}`}
        >
          <form onSubmit={handleUploadCertificate} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p><strong>Worker:</strong> {selectedWorker.full_name} ({selectedWorker.phone})</p>
              <p><strong>Skill Category:</strong> {selectedWorker.skill_category}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Certificate Document (JPG / PNG)</label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileChange}
                required
                className="w-full text-xs font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || !base64File}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Run Real OCR & Submit
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Explicit Adjudication Confirmation / Result Modal */}
      {approvalResult && (
        <ApprovalResultModal
          isOpen={!!approvalResult}
          onClose={() => setApprovalResult(null)}
          result={approvalResult}
        />
      )}
    </div>
  );
}

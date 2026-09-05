import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  IndianRupee,
  FileText,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { disputesApi } from '../api/disputes';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { useToast } from '../context/ToastContext';

export function Disputes() {
  const { success, error, warning } = useToast();
  const [disputes, setDisputes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState('all');

  // Adjudication Modal
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDisputes = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setErrorState(null);
    try {
      const [disputeList, summaryData] = await Promise.all([
        disputesApi.getDisputes(),
        disputesApi.getDisputesSummary().catch(() => null),
      ]);
      setDisputes(Array.isArray(disputeList) ? disputeList : []);
      setSummary(summaryData);
    } catch (err) {
      if (!isSilent) setErrorState(err.message || 'Failed to fetch federation disputes');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
    // Live update: Poll every 3 seconds to immediately reflect disputes submitted from customer/worker app
    const interval = setInterval(() => {
      loadDisputes(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleReviewDispute = async (disputeId) => {
    try {
      await disputesApi.reviewDispute(disputeId);
      success('Dispute marked as Under Review');
      loadDisputes();
      if (selectedDispute?.id === disputeId) {
        setSelectedDispute((prev) => (prev ? { ...prev, status: 'under_review' } : null));
      }
    } catch (err) {
      error(err.message || 'Failed to update dispute status');
    }
  };

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!selectedDispute) return;

    if (resolutionAction === 'refund' && (!refundAmount || Number(refundAmount) <= 0)) {
      error('Please enter a valid positive refund amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await disputesApi.resolveDispute(selectedDispute.id, {
        resolution_action: resolutionAction,
        resolution_notes: resolutionNotes,
        refund_amount: resolutionAction === 'refund' ? Number(refundAmount) : 0,
      });

      success(`Dispute ${selectedDispute.dispute_number} successfully adjudicated`);
      setSelectedDispute(null);
      setResolutionNotes('');
      setRefundAmount('');
      loadDisputes();
    } catch (err) {
      error(err.message || 'Failed to resolve dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (statusFilter === 'all') return true;
    return d.status === statusFilter;
  });

  if (loading) return <LoadingSpinner text="Fetching dispute records and refund logs..." />;
  if (errorState) return <ErrorState message={errorState} onRetry={loadDisputes} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Dispute Adjudication Console</h3>
          <p className="text-xs text-slate-500">
            Federation arbitration tribunal for customer and worker grievances ({filteredDisputes.length} shown)
          </p>
        </div>

        <button
          onClick={loadDisputes}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Disputes</span>
            <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{disputes.length}</h4>
            <p className="text-xs text-slate-400 mt-1">Logged grievances to date</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">Open & In Review</span>
            <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
              {disputes.filter((d) => ['raised', 'under_review'].includes(d.status)).length}
            </h4>
            <p className="text-xs text-slate-400 mt-1">Requiring committee resolution</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Refunded</span>
            <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
              ₹{(summary.total_refunded || 0).toLocaleString('en-IN')}
            </h4>
            <p className="text-xs text-slate-400 mt-1">Disbursed customer compensations</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Disputes</option>
            <option value="raised">Raised (New)</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Disputes Table */}
      {filteredDisputes.length === 0 ? (
        <EmptyState title="No disputes found" description="No customer or worker disputes match your criteria." />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Dispute #</th>
                <th className="py-3.5 px-6">Booking ID</th>
                <th className="py-3.5 px-6">Raised By</th>
                <th className="py-3.5 px-6">Grievance Reason</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {filteredDisputes.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-slate-900">
                    {d.dispute_number || d.id.slice(0, 8)}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-600 truncate max-w-[120px]">
                    {d.booking_id}
                  </td>
                  <td className="py-4 px-6">
                    <span className="capitalize font-semibold text-xs text-slate-800">{d.raised_by_role}</span>
                    <p className="text-[10px] font-mono text-slate-400">{d.raised_by_id?.slice(0, 8)}</p>
                  </td>
                  <td className="py-4 px-6 max-w-sm truncate text-xs text-slate-700">
                    {d.reason}
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => {
                        setSelectedDispute(d);
                        setRefundAmount(d.refund_amount ? String(d.refund_amount) : '200');
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      Adjudicate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjudication Modal */}
      <Modal
        isOpen={!!selectedDispute}
        onClose={() => setSelectedDispute(null)}
        title={selectedDispute ? `Tribunal Case: ${selectedDispute.dispute_number}` : ''}
      >
        {selectedDispute && (
          <form onSubmit={handleResolveDispute} className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-slate-400 block mb-0.5">Dispute Status</span>
                <StatusBadge status={selectedDispute.status} />
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Complainant Role</span>
                <span className="capitalize font-bold text-slate-900">{selectedDispute.raised_by_role}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Booking Reference</span>
                <span className="font-mono font-bold text-slate-900">{selectedDispute.booking_id}</span>
              </div>
            </div>

            {/* Grievance text */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Stated Grievance</span>
              <p className="text-slate-900 text-xs font-medium leading-relaxed">{selectedDispute.reason}</p>
            </div>

            {/* If raised status, offer to transition to under_review */}
            {selectedDispute.status === 'raised' && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <span className="text-blue-900 font-semibold">Mark Case Under Investigation:</span>
                <button
                  type="button"
                  onClick={() => handleReviewDispute(selectedDispute.id)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                >
                  Start Review
                </button>
              </div>
            )}

            {/* Resolution Form (if not already resolved/dismissed) */}
            {['raised', 'under_review'].includes(selectedDispute.status) ? (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold uppercase tracking-wider text-slate-700">Tribunal Adjudication Order</h4>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Resolution Action *</label>
                  <select
                    value={resolutionAction}
                    onChange={(e) => setResolutionAction(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                  >
                    <option value="refund">Authorize Customer Refund (Financial Relief)</option>
                    <option value="warning">Issue Official Warning to Worker (-10 Reliability)</option>
                    <option value="suspension">Suspend Worker Partner from Dispatch</option>
                    <option value="none">Dismiss Grievance (No Infraction Found)</option>
                  </select>
                </div>

                {resolutionAction === 'refund' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Refund Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="e.g., 350"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Adjudication Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Enter formal arbitration rationale..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDispute(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Adjudicating...' : 'Commit Adjudication Order'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="font-bold text-slate-800 block">Final Tribunal Resolution</span>
                <p className="text-slate-600">
                  Action: <strong className="capitalize">{selectedDispute.resolution_action}</strong>
                </p>
                {selectedDispute.refund_amount > 0 && (
                  <p className="text-slate-600">
                    Refund Succeeded: <strong>₹{selectedDispute.refund_amount}</strong>
                  </p>
                )}
                {selectedDispute.resolution_notes && (
                  <p className="text-slate-500 italic">"{selectedDispute.resolution_notes}"</p>
                )}
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}

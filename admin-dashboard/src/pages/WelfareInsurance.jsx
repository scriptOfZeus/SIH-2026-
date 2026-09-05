import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Shield,
  FileText,
  IndianRupee,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { welfareApi } from '../api/welfare';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { useToast } from '../context/ToastContext';

export function WelfareInsurance() {
  const { success, error, warning } = useToast();
  const [fundSummary, setFundSummary] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  // Adjudication Modal
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [ledgerList, setLedgerList] = useState([]);
  const [adjudicateDecision, setAdjudicateDecision] = useState('approved');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWelfareData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const [fund, policyList, claimList, finSummary, ledger] = await Promise.all([
        welfareApi.getFundSummary().catch(() => null),
        welfareApi.getPolicies().catch(() => []),
        welfareApi.getClaims().catch(() => []),
        welfareApi.getFinancialSummary().catch(() => null),
        welfareApi.getPayoutLedger().catch(() => []),
      ]);

      setFundSummary(fund);
      setPolicies(Array.isArray(policyList) ? policyList : []);
      setClaims(Array.isArray(claimList) ? claimList : []);
      setFinancialSummary(finSummary);
      setLedgerList(Array.isArray(ledger) ? ledger : []);
    } catch (err) {
      setErrorState(err.message || 'Failed to fetch welfare data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWelfareData();
  }, []);

  const handleAdjudicateClaim = async (e) => {
    e.preventDefault();
    if (!selectedClaim) return;

    if (adjudicateDecision === 'approved' && (!approvedAmount || Number(approvedAmount) <= 0)) {
      error('Please enter a valid approved claim amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await welfareApi.adjudicateClaim(selectedClaim.id, {
        decision: adjudicateDecision,
        amount_approved: adjudicateDecision === 'approved' ? Number(approvedAmount) : 0,
        admin_notes: adminNotes,
      });

      success(`Claim ${selectedClaim.claim_number || selectedClaim.id.slice(0, 8)} adjudicated`);
      setSelectedClaim(null);
      setAdminNotes('');
      setApprovedAmount('');
      loadWelfareData();
    } catch (err) {
      error(err.message || 'Failed to adjudicate claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Connecting to cooperative welfare ledger and claims..." />;
  if (errorState) return <ErrorState message={errorState} onRetry={loadWelfareData} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Cooperative Welfare & Insurance Fund</h3>
          <p className="text-xs text-slate-500">
            Micro-contribution ledger (2% per booking) and health & tool safety claim disbursements
          </p>
        </div>

        <button
          onClick={loadWelfareData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Ledger
        </button>
      </div>

      {/* Fund Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Net Fund Reserve</span>
          <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
            ₹{(fundSummary?.net_fund_reserve || 0).toLocaleString('en-IN')}
          </h4>
          <p className="text-xs text-slate-400 mt-1">Available for emergency disbursements</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Total Micro-Deductions</span>
          <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
            ₹{(fundSummary?.total_contributions_collected || 0).toLocaleString('en-IN')}
          </h4>
          <p className="text-xs text-slate-400 mt-1">From 2% booking contributions</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Sanctioned Claims</span>
          <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
            ₹{(fundSummary?.total_claims_approved || 0).toLocaleString('en-IN')}
          </h4>
          <p className="text-xs text-slate-400 mt-1">Disbursed relief funds</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Enrolled Workers</span>
          <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{fundSummary?.active_enrollments || 0}</h4>
          <p className="text-xs text-slate-400 mt-1">Active policy subscribers</p>
        </div>
      </div>

      {/* 2-Column Section: Active Policies & Claims Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Policies */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-base text-slate-900">Federation Policies ({policies.length})</h4>
          </div>

          {policies.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No insurance policies created yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {policies.map((p) => (
                <div key={p.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      Provider: {p.provider_name} • Policy #{p.policy_number}
                    </p>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                      Max Coverage: ₹{(p.coverage_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claims Queue */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-base text-slate-900">Worker Relief Claims ({claims.length})</h4>
          </div>

          {claims.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Pending Claims</p>
              <p className="text-[11px] text-slate-400">All submitted welfare claims are adjudicated.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {claims.map((c) => (
                <div key={c.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 font-mono">
                        {c.claim_number || c.id.slice(0, 8)}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-slate-600">
                      Worker: {c.worker_name || c.worker_id} • Policy: {c.policy_name}
                    </p>
                    <p className="text-[11px] text-slate-400">Claimed: ₹{c.amount_claimed || 0}</p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedClaim(c);
                      setApprovedAmount(c.amount_claimed ? String(c.amount_claimed) : '1000');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Adjudicate
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Financial & Insurance Contribution Ledger Section (Phase 6) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="font-extrabold text-base text-slate-900">
              Cooperative Financial & Insurance Ledger
            </h4>
            <p className="text-xs text-slate-500">
              Exact paise allocations: Worker (85%), Insurance Pool (7% Fed / 10% Indep), Federation (4%), Platform Fee (4% / 5%)
            </p>
          </div>
          {financialSummary && (
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                financialSummary.reconciliation_status === 'RECONCILED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {financialSummary.reconciliation_status}
              </span>
              <span className="text-xs font-bold text-slate-700">
                Gross: ₹{(financialSummary.gross_revenue || 0).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {ledgerList.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
            <p className="text-xs font-semibold text-slate-600">No ledger entries recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Entries appear automatically when completed bookings are paid</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Booking / Worker</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Gross</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 font-bold">Worker (85%)</th>
                  <th className="py-2.5 px-3 text-right text-blue-600 font-bold">Insurance</th>
                  <th className="py-2.5 px-3 text-right text-purple-600">Fed (4%)</th>
                  <th className="py-2.5 px-3 text-right text-slate-500">Platform</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerList.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900 font-mono text-[11px]">
                        {entry.booking_id ? entry.booking_id.slice(0, 8).toUpperCase() : 'N/A'}
                      </p>
                      <p className="text-[11px] text-slate-500">{entry.worker_name || 'Worker'}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.worker_type === 'federation' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {entry.worker_type === 'federation' ? 'Federation' : 'Independent'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ₹{(entry.gross_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">
                      ₹{(entry.worker_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-600">
                      ₹{(entry.insurance_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-purple-600">
                      ₹{(entry.federation_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-500">
                      ₹{(entry.platform_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.transaction_type === 'refund' 
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {entry.transaction_type === 'refund' ? 'Refund Reversal' : 'Paid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjudication Modal */}
      <Modal
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
        title={selectedClaim ? `Adjudicate Claim: ${selectedClaim.claim_number || selectedClaim.id}` : ''}
      >
        {selectedClaim && (
          <form onSubmit={handleAdjudicateClaim} className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-slate-400 block mb-0.5">Worker Name</span>
                <span className="font-bold text-slate-900">{selectedClaim.worker_name || selectedClaim.worker_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Contact Phone</span>
                <span className="font-bold text-slate-900">{selectedClaim.worker_phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Insurance Policy</span>
                <span className="font-semibold text-slate-900">{selectedClaim.policy_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Amount Claimed</span>
                <span className="font-bold text-slate-900 text-sm">₹{selectedClaim.amount_claimed}</span>
              </div>
            </div>

            {selectedClaim.claim_reason && (
              <div className="p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Claim Rationale</span>
                <p className="text-slate-900">{selectedClaim.claim_reason}</p>
              </div>
            )}

            {selectedClaim.status === 'submitted' ? (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold uppercase tracking-wider text-slate-700">Adjudication Decision</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Decision *</label>
                    <select
                      value={adjudicateDecision}
                      onChange={(e) => setAdjudicateDecision(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                    >
                      <option value="approved">Approve & Sanction Relief</option>
                      <option value="rejected">Reject Claim</option>
                    </select>
                  </div>

                  {adjudicateDecision === 'approved' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Approved Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={approvedAmount}
                        onChange={(e) => setApprovedAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Committee Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Enter approval or rejection notes..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClaim(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Submit Adjudication'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-slate-600">
                  Status: <strong className="capitalize">{selectedClaim.status}</strong>
                </p>
                {selectedClaim.amount_approved > 0 && (
                  <p className="text-slate-600">
                    Sanctioned Amount: <strong>₹{selectedClaim.amount_approved}</strong>
                  </p>
                )}
                {selectedClaim.admin_notes && (
                  <p className="text-slate-500 italic mt-1">"{selectedClaim.admin_notes}"</p>
                )}
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}

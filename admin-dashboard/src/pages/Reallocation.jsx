import React, { useState, useEffect } from 'react';
import {
  GitFork,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  MapPin,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { analyticsApi } from '../api/analytics';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/common/FeedbackStates';

export function Reallocation() {
  const [reallocationData, setReallocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [horizonDays, setHorizonDays] = useState(7);
  const [actionedPlans, setActionedPlans] = useState({});

  const handleApprove = (idx) => {
    setActionedPlans((prev) => ({ ...prev, [idx]: 'approved' }));
  };

  const handleDecline = (idx) => {
    setActionedPlans((prev) => ({ ...prev, [idx]: 'declined' }));
  };

  const loadReallocation = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const data = await analyticsApi.getReallocationSuggestions(horizonDays);
      setReallocationData(data);
    } catch (err) {
      setErrorState(err.message || 'Failed to compute workforce reallocation suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReallocation();
  }, [horizonDays]);

  if (loading) return <LoadingSpinner text="Computing geographic worker reallocation matrix..." />;
  if (errorState) return <ErrorState message={errorState} onRetry={loadReallocation} />;

  const suggestions =
    reallocationData?.reallocation_recommendations ||
    reallocationData?.reallocations ||
    reallocationData?.suggestions ||
    [];

  const summary = reallocationData?.summary || {};
  const regionalBalance = reallocationData?.regional_balance || [];
  const deficitRegions = regionalBalance.filter((r) => r.deficit > 0);
  const surplusRegions = regionalBalance.filter((r) => r.surplus > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-slate-900">Workforce Reallocation Engine</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-extrabold">
              <Zap className="w-3 h-3 text-indigo-600" />
              Proximity Optimization
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            AI-suggested inter-region worker transfers to alleviate demand shortages and balance labor capacity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={horizonDays}
            onChange={(e) => setHorizonDays(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={3}>3 Days Horizon</option>
            <option value={7}>7 Days Horizon</option>
            <option value={14}>14 Days Horizon</option>
          </select>

          <button
            onClick={loadReallocation}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recompute
          </button>
        </div>
      </div>

      {/* Human-in-the-Loop Policy Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <span className="font-extrabold uppercase tracking-wide text-[11px] block">Human-in-the-Loop Policy Guarantee</span>
          <span>AI only generates reallocation recommendations. No workers are automatically transferred. A human administrator must review and authorize any operational dispatch.</span>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-500">Deficit Hotspots</span>
          <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
            {summary.hotspots_detected ?? deficitRegions.length}
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Total deficit: {summary.total_deficit ?? deficitRegions.reduce((a, c) => a + c.deficit, 0)} workers
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Surplus Supply</span>
          <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
            {summary.total_surplus ?? surplusRegions.reduce((a, c) => a + c.surplus, 0)}
          </h4>
          <p className="text-xs text-slate-400 mt-1">Idle verified workers available</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Transfer Proposals</span>
          <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{suggestions.length}</h4>
          <p className="text-xs text-slate-400 mt-1">Actionable dispatch pairings</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">Zones Evaluated</span>
          <h4 className="text-2xl font-extrabold text-slate-900 mt-1">
            {reallocationData?.regions_evaluated?.length ?? 4}
          </h4>
          <p className="text-xs text-slate-400 mt-1">Kolkata, Mumbai, Delhi, Bengaluru</p>
        </div>
      </div>

      {/* Reallocation Suggestions List */}
      {suggestions.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Labor Supply is Optimal"
          description="Local worker capacity matches predicted demand across all federation zones. No reallocations required."
        />
      ) : (
        <div className="space-y-4">
          <h4 className="font-extrabold text-base text-slate-900">Recommended Transfer Plans ({suggestions.length})</h4>

          <div className="grid grid-cols-1 gap-4">
            {suggestions.map((plan, idx) => {
              const count = plan.reallocate_count || plan.suggested_transfer_count || 5;
              const decision = actionedPlans[idx];

              return (
                <div
                  key={`plan-${idx}`}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:border-blue-300"
                >
                  {/* Origin -> Destination Flow */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        PAIRING #{idx + 1}
                      </span>
                      <span className="font-bold text-sm capitalize text-blue-700">
                        Skill: {plan.skill_category || 'General Service'}
                      </span>
                      {decision === 'approved' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                          Approved by Admin
                        </span>
                      ) : decision === 'declined' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-600">
                          Declined
                        </span>
                      ) : (
                        <Badge variant="warning">{plan.status || 'Pending Human Approval'}</Badge>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pt-1">
                      {/* Source */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 min-w-[160px]">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Surplus Source</span>
                        <p className="font-extrabold text-slate-900 text-sm">{plan.source_region}</p>
                        <span className="text-[11px] text-emerald-600 font-semibold">Surplus Available</span>
                      </div>

                      <div className="flex items-center justify-center text-blue-600">
                        <ArrowRight className="w-5 h-5 hidden sm:block" />
                        <span className="sm:hidden text-xs font-bold text-slate-400">Transfers to ↓</span>
                      </div>

                      {/* Destination */}
                      <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 min-w-[160px]">
                        <span className="text-[10px] font-bold uppercase text-rose-400 block">Deficit Hotspot</span>
                        <p className="font-extrabold text-slate-900 text-sm">{plan.target_region}</p>
                        <span className="text-[11px] text-rose-600 font-semibold">Demand Hotspot</span>
                      </div>
                    </div>

                    {plan.reason && (
                      <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                        <strong>AI Rationale:</strong> {plan.operational_rationale || plan.reason}
                      </p>
                    )}
                  </div>

                  {/* Recommendation Numbers & Admin Decision */}
                  <div className="flex flex-col sm:items-end gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 shrink-0 text-left sm:text-right">
                    <div>
                      <span className="text-xs text-slate-400 block">Recommended Transfer</span>
                      <span className="text-2xl font-black text-slate-900">
                        {count} <span className="text-xs font-normal text-slate-500">workers</span>
                      </span>
                    </div>

                    {plan.distance_km && (
                      <p className="text-xs text-slate-400 font-medium">Distance: ~{plan.distance_km} km</p>
                    )}

                    {!decision ? (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleApprove(idx)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors cursor-pointer shadow-xs"
                        >
                          Approve Dispatch
                        </button>
                        <button
                          onClick={() => handleDecline(idx)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 mt-2">Decision Logged</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

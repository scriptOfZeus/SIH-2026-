import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck,
  IndianRupee,
  ShieldAlert,
  Flame,
  Scale,
  HeartHandshake,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { analyticsApi } from '../api/analytics';
import { bookingsApi } from '../api/bookings';
import { disputesApi } from '../api/disputes';
import { welfareApi } from '../api/welfare';
import { workersApi } from '../api/workers';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge, Badge } from '../components/common/Badge';
import { LoadingSpinner, ErrorState } from '../components/common/FeedbackStates';

export function Overview({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    summary: null,
    bookings: [],
    disputesSummary: null,
    fundSummary: null,
    workers: [],
  });

  const loadOverviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, bookings, disputesSummary, fundSummary, workers] = await Promise.all([
        analyticsApi.getSummary().catch(() => null),
        bookingsApi.getBookings().catch(() => []),
        disputesApi.getDisputesSummary().catch(() => null),
        welfareApi.getFundSummary().catch(() => null),
        workersApi.getWorkers().catch(() => []),
      ]);

      setData({
        summary,
        bookings: Array.isArray(bookings) ? bookings : [],
        disputesSummary,
        fundSummary,
        workers: Array.isArray(workers) ? workers : [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load federation overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewData();
  }, []);

  if (loading) return <LoadingSpinner text="Fetching live federation telemetry and metrics..." />;
  if (error) return <ErrorState message={error} onRetry={loadOverviewData} />;

  const { summary, bookings, disputesSummary, fundSummary, workers } = data;

  const activeBookings = bookings.filter((b) => ['accepted', 'arriving', 'in_progress'].includes(b.status));
  const emergencyBookings = bookings.filter((b) => b.is_emergency == 1 || b.is_emergency === true);
  const activeEmergency = emergencyBookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled');
  const availableWorkers = workers.filter((w) => w.is_available == 1 && w.verification_status === 'approved');
  const pendingVerifications = workers.filter((w) => w.verification_status === 'pending');

  const openDisputesCount = disputesSummary?.status_counts
    ?.filter((s) => ['raised', 'under_review'].includes(s.status))
    ?.reduce((acc, curr) => acc + parseInt(curr.count, 10), 0) || 0;

  return (
    <div className="space-y-8">
      {/* Top Banner Alert if Emergency or Pending Actions */}
      {(activeEmergency.length > 0 || pendingVerifications.length > 0 || openDisputesCount > 0) && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">Action Items Require Attention</p>
              <p className="text-xs text-amber-800">
                {activeEmergency.length > 0 && `${activeEmergency.length} active emergency dispatch(es) • `}
                {pendingVerifications.length > 0 && `${pendingVerifications.length} worker verification(s) pending • `}
                {openDisputesCount > 0 && `${openDisputesCount} open dispute(s)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeEmergency.length > 0 && (
              <button
                onClick={() => onNavigate('active-emergency')}
                className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-sm"
              >
                View Emergencies
              </button>
            )}
            {pendingVerifications.length > 0 && (
              <button
                onClick={() => onNavigate('verification')}
                className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors shadow-sm"
              >
                Review OCR
              </button>
            )}
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Verified Workers"
          value={summary?.activeWorkers ?? workers.filter((w) => w.verification_status === 'approved').length}
          subtitle={`${availableWorkers.length} currently online & available`}
          icon={Users}
          color="blue"
          onClick={() => onNavigate('workers')}
        />
        <StatCard
          title="Active Jobs"
          value={activeBookings.length}
          subtitle={`${bookings.filter((b) => b.status === 'completed').length} completed total`}
          icon={CalendarCheck}
          color="emerald"
          onClick={() => onNavigate('bookings')}
        />
        <StatCard
          title="Pending OCR Verification"
          value={summary?.pendingWorkers ?? pendingVerifications.length}
          subtitle="Certificate safety checks"
          icon={ShieldAlert}
          color="amber"
          onClick={() => onNavigate('verification')}
        />
        <StatCard
          title="Total Federation Revenue"
          value={`₹${(summary?.totalRevenue || 0).toLocaleString('en-IN')}`}
          subtitle={`From ${summary?.totalBookings || bookings.length} total bookings`}
          icon={IndianRupee}
          color="purple"
          onClick={() => onNavigate('bookings')}
        />
      </div>

      {/* Secondary Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Emergency Dispatches"
          value={emergencyBookings.length}
          subtitle={`${activeEmergency.length} currently in flight`}
          icon={Flame}
          color="rose"
          onClick={() => onNavigate('active-emergency')}
        />
        <StatCard
          title="Open Disputes"
          value={openDisputesCount}
          subtitle={`₹${(disputesSummary?.total_refunded || 0).toLocaleString('en-IN')} refunded to date`}
          icon={Scale}
          color="cyan"
          onClick={() => onNavigate('disputes')}
        />
        <StatCard
          title="Welfare Fund Reserve"
          value={`₹${(fundSummary?.net_fund_reserve || 0).toLocaleString('en-IN')}`}
          subtitle={`${fundSummary?.active_enrollments || 0} worker enrollments`}
          icon={HeartHandshake}
          color="emerald"
          onClick={() => onNavigate('welfare')}
        />
        <StatCard
          title="AI Demand Forecast"
          value="Active"
          subtitle="Hotspot & gap reallocation"
          icon={TrendingUp}
          color="blue"
          onClick={() => onNavigate('forecast')}
        />
      </div>

      {/* 2-Column Operational Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bookings Queue */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Service Bookings</h3>
              <p className="text-xs text-slate-500">Live booking activity in this federation</p>
            </div>
            <button
              onClick={() => onNavigate('bookings')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {bookings.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No bookings registered yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.slice(0, 5).map((b) => (
                <div key={b.id} className="py-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800 uppercase tracking-tight">
                        {b.short_code || b.id.slice(0, 8)}
                      </span>
                      {b.is_emergency == 1 && <Badge variant="emergency">EMERGENCY</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 capitalize">{b.skill_category} • {b.service_address || 'Address'}</p>
                  </div>

                  <div className="text-right">
                    <StatusBadge status={b.status} />
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                      {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Worker Verification Queue */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pending Worker Verification</h3>
              <p className="text-xs text-slate-500">Certificates requiring OCR approval</p>
            </div>
            <button
              onClick={() => onNavigate('verification')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Verify Queue <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingVerifications.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">All Workers Verified</p>
              <p className="text-[11px] text-slate-400">No pending certificates in verification queue.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingVerifications.slice(0, 5).map((w) => (
                <div key={w.id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-800">{w.full_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{w.skill_category} • Cert: {w.skill_certificate_number || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={w.ocr_status || 'pending'} />
                    <button
                      onClick={() => onNavigate('verification')}
                      className="block mt-1 text-xs text-blue-600 font-bold hover:underline"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

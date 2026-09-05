import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  Radio,
  UserCheck,
  AlertOctagon,
  RefreshCw,
  MapPin,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { bookingsApi } from '../api/bookings';
import { StatusBadge, Badge } from '../components/common/Badge';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/common/FeedbackStates';

export function ActiveEmergencyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  const loadActiveAndEmergency = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const allBookings = await bookingsApi.getBookings();
      setBookings(Array.isArray(allBookings) ? allBookings : []);
    } catch (err) {
      setErrorState(err.message || 'Failed to fetch active/emergency dispatches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveAndEmergency();
    const interval = setInterval(() => {
      loadActiveAndEmergency();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner text="Connecting to emergency dispatch channel..." />;
  if (errorState) return <ErrorState message={errorState} onRetry={loadActiveAndEmergency} />;

  // Filter for active jobs and all emergency bookings
  const activeJobs = bookings.filter((b) => ['accepted', 'arriving', 'in_progress'].includes(b.status));
  const emergencyDispatches = bookings.filter(
    (b) => (b.is_emergency == 1 || b.is_emergency === true) && b.status !== 'completed' && b.status !== 'cancelled'
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Live & Emergency Dispatch Console</h3>
          <p className="text-xs text-slate-500">
            Realtime monitoring of on-demand emergency dispatches and active in-flight worker jobs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live Polling (15s)
          </div>
          <button
            onClick={loadActiveAndEmergency}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Emergency On-Demand Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-red-600" />
          <h4 className="font-extrabold text-base text-slate-900">Emergency Dispatch Queue ({emergencyDispatches.length})</h4>
        </div>

        {emergencyDispatches.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No Active Emergency Requests</p>
            <p className="text-xs text-slate-400">All emergency calls in your federation have been resolved or assigned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {emergencyDispatches.map((b) => {
              let rejectedList = [];
              try {
                rejectedList = JSON.parse(b.rejected_worker_ids || '[]');
              } catch {}

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border-2 border-red-200 p-5 shadow-sm space-y-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-red-600 text-white font-black text-[10px] uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                    PRIORITY EMERGENCY
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-slate-900">{b.short_code || b.id.slice(0, 8)}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 capitalize">
                      Service: {b.skill_category} • SLA Target &lt; 300s
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-red-50/50 border border-red-100 text-xs space-y-2">
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="font-medium truncate">{b.service_address}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-red-100 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Dispatch Attempts:</span>
                        <span className="font-bold text-slate-800">{b.dispatch_attempts ?? 1}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Assigned Worker:</span>
                        <span className="font-bold text-slate-800 font-mono">{b.worker_id || 'Seeking...'}</span>
                      </div>
                    </div>

                    {rejectedList.length > 0 && (
                      <div className="text-[11px] text-rose-700">
                        Skipped/Timed-out workers: {rejectedList.length}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Emergency Surcharge: <strong>₹{b.emergency_fee ?? 50}</strong></span>
                    <span>Received: {new Date(b.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active In-Progress Jobs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-blue-600" />
          <h4 className="font-extrabold text-base text-slate-900">Active In-Flight Services ({activeJobs.length})</h4>
        </div>

        {activeJobs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No Active Jobs Currently in Transit</p>
            <p className="text-xs text-slate-400">Workers will appear here once bookings transition to accepted.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Booking Code</th>
                  <th className="py-3.5 px-6">Service Category</th>
                  <th className="py-3.5 px-6">Location</th>
                  <th className="py-3.5 px-6">Worker ID</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {activeJobs.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {b.short_code || b.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-6 capitalize">{b.skill_category}</td>
                    <td className="py-4 px-6 max-w-xs truncate text-xs text-slate-600">{b.service_address}</td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-800">{b.worker_id || 'Pending'}</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-slate-500">
                      {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

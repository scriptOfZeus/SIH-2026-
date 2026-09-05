import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  Flame,
  MapPin,
  Clock,
  User,
  Wrench,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  IndianRupee,
} from 'lucide-react';
import { bookingsApi } from '../api/bookings';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/common/FeedbackStates';

export function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');

  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const data = await bookingsApi.getBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorState(err.message || 'Failed to fetch federation bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.id?.toLowerCase().includes(search.toLowerCase()) ||
      b.short_code?.toLowerCase().includes(search.toLowerCase()) ||
      b.service_address?.toLowerCase().includes(search.toLowerCase()) ||
      b.skill_category?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'emergency' && (b.is_emergency == 1 || b.is_emergency === true)) ||
      (typeFilter === 'scheduled' && (b.is_emergency == 0 || !b.is_emergency));
    const matchesSkill = skillFilter === 'all' || b.skill_category === skillFilter;

    return matchesSearch && matchesStatus && matchesType && matchesSkill;
  });

  const skills = Array.from(new Set(bookings.map((b) => b.skill_category).filter(Boolean)));

  if (loading) return <LoadingSpinner text="Fetching federation booking records..." />;
  if (errorState) return <ErrorState message={errorState} onRetry={loadBookings} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Booking Management</h3>
          <p className="text-xs text-slate-500">
            Realtime service requests and completed jobs across your federation ({filteredBookings.length} shown)
          </p>
        </div>

        <button
          onClick={loadBookings}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by code, service address, skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="requested">Requested</option>
            <option value="accepted">Accepted / In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="unassigned">Unassigned</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="emergency">Emergency Only</option>
            <option value="scheduled">Scheduled Only</option>
          </select>

          {/* Skill Filter */}
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Skills</option>
            {skills.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredBookings.length === 0 ? (
        <EmptyState title="No bookings found" description="No booking records match your search criteria." />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Code / Service</th>
                  <th className="py-3.5 px-6">Location</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Created</th>
                  <th className="py-3.5 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-xs">
                          {b.skill_category?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 uppercase">{b.short_code || b.id.slice(0, 8)}</p>
                          <p className="text-xs text-slate-500 capitalize">{b.skill_category}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 max-w-xs truncate">
                      <p className="truncate text-slate-800">{b.service_address || 'Address not specified'}</p>
                      {b.estimated_distance_km !== null && b.estimated_distance_km !== undefined && (
                        <p className="text-[11px] text-slate-400">{b.estimated_distance_km} km estimate</p>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      {b.is_emergency == 1 || b.is_emergency === true ? (
                        <Badge variant="emergency">EMERGENCY</Badge>
                      ) : (
                        <Badge variant="neutral">Scheduled</Badge>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <StatusBadge status={b.status} />
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-500">
                      {new Date(b.created_at).toLocaleDateString()}{' '}
                      <span className="text-slate-400">
                        {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking ? `Booking Record: ${selectedBooking.short_code || selectedBooking.id}` : ''}
      >
        {selectedBooking && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-slate-400 block">Booking Status</span>
                <StatusBadge status={selectedBooking.status} />
              </div>
              <div>
                <span className="text-slate-400 block">Service Type</span>
                <span className="font-bold text-slate-900">
                  {selectedBooking.is_emergency ? 'Emergency On-Demand' : 'Scheduled Service'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Skill Category</span>
                <span className="capitalize font-bold text-slate-900">{selectedBooking.skill_category}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Customer ID</span>
                <span className="font-mono text-slate-800">{selectedBooking.customer_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Assigned Worker ID</span>
                <span className="font-mono text-slate-800">{selectedBooking.worker_id || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Scheduled Window</span>
                <span className="font-semibold text-slate-800">{selectedBooking.scheduled_time || 'Immediate'}</span>
              </div>
            </div>

            {/* Address & Coordinates */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Service Address</span>
              <p className="font-semibold text-slate-900 text-sm">{selectedBooking.service_address}</p>
              {selectedBooking.service_lat && selectedBooking.service_lng && (
                <p className="text-slate-400 text-[11px]">
                  Coordinates: {selectedBooking.service_lat}, {selectedBooking.service_lng}
                </p>
              )}
            </div>

            {/* Financials & Parts breakdown */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">Financial & Work Notes</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block">Parts Fee</span>
                  <span className="font-bold text-slate-900">₹{selectedBooking.parts_fee ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Emergency Fee</span>
                  <span className="font-bold text-slate-900">₹{selectedBooking.emergency_fee ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Customer Confirmed</span>
                  <span className="font-bold text-slate-900">
                    {selectedBooking.completed_by_customer ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Worker Confirmed</span>
                  <span className="font-bold text-slate-900">
                    {selectedBooking.completed_by_worker ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {selectedBooking.service_notes && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Completion Notes:</span>
                  <p className="text-slate-800">{selectedBooking.service_notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Star,
  Phone,
  CheckCircle,
  XCircle,
  FileText,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { workersApi } from '../api/workers';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { useToast } from '../context/ToastContext';

export function Workers({ onNavigateToVerification }) {
  const { success, error } = useToast();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [availFilter, setAvailFilter] = useState('all');

  // Modals
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({
    full_name: '',
    phone: '',
    skill_category: 'electrician',
    skill_certificate_number: '',
    lat: 12.9352,
    lng: 77.6245,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWorkers = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const data = await workersApi.getWorkers();
      setWorkers(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorState(err.message || 'Failed to fetch workers list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    if (!newWorker.full_name || !newWorker.phone || !newWorker.skill_certificate_number) {
      error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await workersApi.createWorker(newWorker);
      success(`Worker ${newWorker.full_name} registered successfully`);
      setIsAddModalOpen(false);
      setNewWorker({
        full_name: '',
        phone: '',
        skill_category: 'electrician',
        skill_certificate_number: '',
        lat: 12.9352,
        lng: 77.6245,
      });
      loadWorkers();
    } catch (err) {
      error(err.message || 'Failed to create worker');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered workers list
  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      w.phone?.includes(search) ||
      w.skill_certificate_number?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || w.verification_status === statusFilter;
    const matchesSkill = skillFilter === 'all' || w.skill_category === skillFilter;
    const matchesAvail =
      availFilter === 'all' ||
      (availFilter === 'online' && w.is_available == 1) ||
      (availFilter === 'offline' && (w.is_available == 0 || w.is_available === null));

    return matchesSearch && matchesStatus && matchesSkill && matchesAvail;
  });

  const skills = Array.from(new Set(workers.map((w) => w.skill_category).filter(Boolean)));

  if (loading) return <LoadingSpinner text="Loading worker partners..." />;
  if (errorState) return <ErrorState message={errorState} onRetry={loadWorkers} />;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Worker Directory</h3>
          <p className="text-xs text-slate-500">
            Registered cooperative workers in your federation ({filteredWorkers.length} shown)
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Worker
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, or certificate..."
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
            <option value="all">All Verification Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Verification</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
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

          {/* Availability Filter */}
          <select
            value={availFilter}
            onChange={(e) => setAvailFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Availability</option>
            <option value="online">Online / Available</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Workers Table */}
      {filteredWorkers.length === 0 ? (
        <EmptyState
          title="No workers match current criteria"
          description="Try clearing search or adjusting your filters."
          actionText="Add New Worker"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Worker Partner</th>
                  <th className="py-3.5 px-6">Skill Category</th>
                  <th className="py-3.5 px-6">Availability</th>
                  <th className="py-3.5 px-6">Verification</th>
                  <th className="py-3.5 px-6">OCR Status</th>
                  <th className="py-3.5 px-6">Rating / Score</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {filteredWorkers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                          {w.full_name?.charAt(0) || 'W'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{w.full_name}</p>
                          <p className="text-xs text-slate-400">{w.phone}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="capitalize font-semibold text-slate-800">{w.skill_category}</span>
                      <p className="text-[11px] text-slate-400">Cert: {w.skill_certificate_number || 'None'}</p>
                    </td>

                    <td className="py-4 px-6">
                      {w.is_available == 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                          Offline
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <StatusBadge status={w.verification_status} />
                    </td>

                    <td className="py-4 px-6">
                      {w.ocr_status ? (
                        <StatusBadge status={w.ocr_status} />
                      ) : (
                        <span className="text-xs text-slate-400">Not Uploaded</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {w.avg_rating || '5.0'}
                        </span>
                        <span className="text-xs text-slate-400">• Score: {w.reliability_score ?? 1.0}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedWorker(w)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Worker Details Modal */}
      <Modal
        isOpen={!!selectedWorker}
        onClose={() => setSelectedWorker(null)}
        title={selectedWorker ? `Worker Profile: ${selectedWorker.full_name}` : ''}
      >
        {selectedWorker && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Worker ID</span>
                <span className="font-mono font-bold text-slate-800">{selectedWorker.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Contact Phone</span>
                <span className="font-bold text-slate-800">{selectedWorker.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Primary Skill</span>
                <span className="capitalize font-bold text-slate-800">{selectedWorker.skill_category}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Verification Status</span>
                <StatusBadge status={selectedWorker.verification_status} />
              </div>
            </div>

            {/* OCR & Certification Info */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Certification & OCR Safety Audit
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Certificate #</span>
                  <span className="font-semibold text-slate-800">{selectedWorker.skill_certificate_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Certificate Verified</span>
                  <span className="font-semibold text-slate-800">
                    {selectedWorker.skill_certificate_verified ? 'Yes (Verified)' : 'No (Unverified)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">OCR Status</span>
                  <StatusBadge status={selectedWorker.ocr_status || 'pending'} />
                </div>
                <div>
                  <span className="text-slate-400 block">OCR Confidence</span>
                  <span className="font-semibold text-slate-800">
                    {selectedWorker.ocr_confidence_score
                      ? `${(selectedWorker.ocr_confidence_score * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {selectedWorker.ocr_extracted_name && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <p className="text-slate-500">
                    OCR Extracted Name: <strong className="text-slate-800">{selectedWorker.ocr_extracted_name}</strong>
                  </p>
                  <p className="text-slate-500">
                    OCR Extracted Number: <strong className="text-slate-800">{selectedWorker.ocr_extracted_number}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {selectedWorker.verification_status === 'pending' && onNavigateToVerification && (
                <button
                  onClick={() => {
                    setSelectedWorker(null);
                    onNavigateToVerification();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
                >
                  Go to OCR Verification Queue
                </button>
              )}
              <button
                onClick={() => setSelectedWorker(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Worker Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Worker Partner">
        <form onSubmit={handleCreateWorker} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., Rajesh Kumar"
              value={newWorker.full_name}
              onChange={(e) => setNewWorker({ ...newWorker, full_name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+919876543210"
                value={newWorker.phone}
                onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Primary Skill *</label>
              <select
                value={newWorker.skill_category}
                onChange={(e) => setNewWorker({ ...newWorker, skill_category: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="electrician">Electrician</option>
                <option value="plumber">Plumber</option>
                <option value="carpenter">Carpenter</option>
                <option value="appliance_repair">Appliance Repair</option>
                <option value="mason">Mason</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Skill Certificate Number *</label>
            <input
              type="text"
              required
              placeholder="e.g., ELEC-WB-7728"
              value={newWorker.skill_certificate_number}
              onChange={(e) => setNewWorker({ ...newWorker, skill_certificate_number: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={newWorker.lat}
                onChange={(e) => setNewWorker({ ...newWorker, lat: parseFloat(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={newWorker.lng}
                onChange={(e) => setNewWorker({ ...newWorker, lng: parseFloat(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register Worker'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

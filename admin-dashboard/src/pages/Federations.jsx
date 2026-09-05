import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  CalendarCheck,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserPlus,
  RefreshCw,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { federationsApi } from '../api/federations';
import { useAuth } from '../context/AuthContext';

export function Federations() {
  const { isSuperAdmin, switchFederation, reloadFederations } = useAuth();
  const [federations, setFederations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignAdminModal, setShowAssignAdminModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    region: 'North Zone',
    description: '',
    location: '',
    contact_phone: '',
    contact_email: '',
    status: 'active',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });

  // Assign Admin Form State
  const [assignForm, setAssignForm] = useState({
    full_name: '',
    email: '',
    password: '',
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await federationsApi.getAll();
      setFederations(Array.isArray(data) ? data : []);
      await reloadFederations();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load federations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateFederation = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await federationsApi.create(createForm);
      setSuccessMsg(`Federation "${createForm.name}" created successfully!`);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        code: '',
        region: 'North Zone',
        description: '',
        location: '',
        contact_phone: '',
        contact_email: '',
        status: 'active',
        admin_name: '',
        admin_email: '',
        admin_password: '',
      });
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create federation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (fed) => {
    const nextStatus = fed.status === 'active' ? 'inactive' : 'active';
    try {
      await federationsApi.update(fed.id, { status: nextStatus });
      setSuccessMsg(`Federation ${fed.name} is now ${nextStatus}`);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update federation status');
    }
  };

  const handleAssignAdmin = async (e) => {
    e.preventDefault();
    if (!showAssignAdminModal || !assignForm.email.trim() || !assignForm.password.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await federationsApi.assignAdmin(showAssignAdminModal.id, assignForm);
      setSuccessMsg(`Admin assigned to ${showAssignAdminModal.name} successfully!`);
      setShowAssignAdminModal(null);
      setAssignForm({ full_name: '', email: '', password: '' });
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign administrator');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = federations.filter((fed) => {
    const matchSearch =
      fed.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fed.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fed.region?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || fed.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-blue-300 text-xs font-black uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" /> Supervising Admin Console
          </div>
          <h1 className="text-2xl font-black tracking-tight">Federation Network Management</h1>
          <p className="text-sm text-blue-200 mt-1 max-w-xl">
            Create, configure, and supervise regional cooperative federations. Manage assigned administrators, workforce capacities, and published forecasts.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-extrabold text-sm transition-all shadow-lg shadow-blue-500/30 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Federation
          </button>
        )}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900 font-bold">✕</button>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, code or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>Total Federations: {federations.length}</span>
          <button
            onClick={loadData}
            title="Reload list"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Federations Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">Loading federations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-slate-800">No Federations Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No federations match your search criteria.' : 'Create your first cooperative federation to start onboarding workers.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((fed) => (
            <div
              key={fed.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-mono font-extrabold tracking-wider uppercase border border-blue-100">
                      {fed.code || 'FED-GEN'}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1.5 tracking-tight">{fed.name}</h3>
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" /> {fed.region || 'Regional Hub'}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                      fed.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {fed.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {fed.status}
                  </span>
                </div>

                {fed.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {fed.description}
                  </p>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 mb-4 text-center">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Workers</p>
                    <p className="text-base font-black text-slate-900">{fed.worker_count || 0}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Bookings</p>
                    <p className="text-base font-black text-slate-900">{fed.booking_count || 0}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Forecasts</p>
                    <p className="text-base font-black text-slate-900">{fed.forecast_count || 0}</p>
                  </div>
                </div>

                {/* Admins */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase">Assigned Admins</p>
                    {isSuperAdmin && (
                      <button
                        onClick={() => setShowAssignAdminModal(fed)}
                        className="text-[11px] font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" /> Add Admin
                      </button>
                    )}
                  </div>
                  {fed.admins && fed.admins.length > 0 ? (
                    <div className="space-y-1">
                      {fed.admins.map((adm) => (
                        <div key={adm.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="font-bold text-slate-800 truncate">{adm.full_name || 'Admin'}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{adm.email}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 bg-amber-50/70 border border-amber-200/60 p-2 rounded-lg font-medium">
                      No admin assigned yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => switchFederation(fed.id)}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Switch Context
                </button>

                {isSuperAdmin && (
                  <button
                    onClick={() => handleToggleStatus(fed)}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs transition-colors cursor-pointer ${
                      fed.status === 'active'
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {fed.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Federation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Create New Federation</h3>
                  <p className="text-xs text-slate-500">Configure a new regional cooperative entity</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateFederation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Federation Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharashtra Skill Cooperative"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unique Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. MH-COOP-01"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Region / Zone *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Western Region"
                    value={createForm.region}
                    onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune, Maharashtra"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Cooperative service coverage, trades, and background..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Optional Federation Admin Section */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-blue-600" /> Initial Federation Admin (Optional)
                </h4>

                <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Admin Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Patil"
                        value={createForm.admin_name}
                        onChange={(e) => setCreateForm({ ...createForm, admin_name: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Admin Email</label>
                      <input
                        type="email"
                        placeholder="rajesh@mhcoop.org"
                        value={createForm.admin_email}
                        onChange={(e) => setCreateForm({ ...createForm, admin_email: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Temporary Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={createForm.admin_password}
                      onChange={(e) => setCreateForm({ ...createForm, admin_password: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create Federation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Admin Modal */}
      {showAssignAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Assign Federation Admin</h3>
                <p className="text-xs text-blue-600 font-bold">{showAssignAdminModal.name}</p>
              </div>
              <button onClick={() => setShowAssignAdminModal(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleAssignAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Deshmukh"
                  value={assignForm.full_name}
                  onChange={(e) => setAssignForm({ ...assignForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="anand@federation.org"
                  value={assignForm.email}
                  onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={assignForm.password}
                  onChange={(e) => setAssignForm({ ...assignForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignAdminModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Assign Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

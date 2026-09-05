import React from 'react';
import { Building2, ShieldCheck, Server, Globe, Key, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, SOCKET_URL } from '../config/api';

export function Settings() {
  const { admin, federation } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Federation Settings & System Parameters</h3>
        <p className="text-xs text-slate-500">
          Multi-tenant isolation configurations and federation operational parameters
        </p>
      </div>

      {/* Federation Details */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-base text-slate-900">Cooperative Federation Identity</h4>
            <p className="text-xs text-slate-500">Tenant boundaries and administrative region</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block mb-1">Federation Name</span>
            <span className="font-bold text-slate-900 text-sm">{federation?.name || 'Pilot Federation'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block mb-1">Tenant ID (JWT Isolated)</span>
            <span className="font-mono font-bold text-slate-900">{federation?.id || '34ee6e2e-...'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block mb-1">Geographic Region</span>
            <span className="font-bold text-slate-900 capitalize">{federation?.region || 'West Bengal'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block mb-1">Admin Officer</span>
            <span className="font-bold text-slate-900">{admin?.full_name || 'Authorized Officer'}</span>
          </div>
        </div>
      </div>

      {/* Backend & Connectivity Parameters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-base text-slate-900">Backend & Engine Status</h4>
            <p className="text-xs text-slate-500">Live service nodes powering Sahkar Sewa</p>
          </div>
        </div>

        <div className="space-y-3 text-xs pt-1">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">REST API Gateway</p>
              <p className="font-mono text-slate-500 text-[11px]">{API_BASE_URL}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
              Connected
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">Realtime Socket.IO Streamer</p>
              <p className="font-mono text-slate-500 text-[11px]">{SOCKET_URL}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
              Ready (Port 5000)
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">AI Forecasting Engine</p>
              <p className="font-mono text-slate-500 text-[11px]">FastAPI Microservice (Port 8000)</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
              Holt-Winters ML Active
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">PostgreSQL Database Storage</p>
              <p className="font-mono text-slate-500 text-[11px]">Supabase Cloud Pooler (Port 6543)</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
              Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

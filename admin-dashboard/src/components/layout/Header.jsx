import React, { useState, useEffect } from 'react';
import { User, Bell, RefreshCw, Clock, Building2, ChevronDown, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Header({ currentTabTitle, onRefresh, isRefreshing }) {
  const { admin, federation, isSuperAdmin, availableFederations, selectedFederationId, switchFederation } = useAuth();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{currentTabTitle}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Real-time Clock */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time}</span>
        </div>

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh current data"
            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        )}

        {/* Supervising Admin Federation Switcher / Scope Selector */}
        {isSuperAdmin ? (
          <div className="flex items-center gap-2">
            <span className="hidden xl:inline-block text-xs font-bold text-slate-400 uppercase tracking-wider">Context:</span>
            <div className="relative">
              <select
                value={selectedFederationId || ''}
                onChange={(e) => switchFederation(e.target.value || null)}
                className="appearance-none pl-8 pr-8 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                <option value="">🌐 All Federations (Global)</option>
                {availableFederations.map((fed) => (
                  <option key={fed.id} value={fed.id}>
                    🏢 {fed.name} ({fed.code || 'ACTIVE'})
                  </option>
                ))}
              </select>
              <Building2 className="w-3.5 h-3.5 text-indigo-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-indigo-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-[10px] font-black text-white uppercase tracking-wider shadow-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Super Admin
            </span>
          </div>
        ) : (
          /* Federation Admin Scope Badge */
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="truncate max-w-[160px] font-bold">{federation?.name || 'Assigned Federation'}</span>
            </div>
            <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase tracking-wider">
              Fed Admin
            </span>
          </div>
        )}

        {/* Admin Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm">
            {admin?.full_name ? admin.full_name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-none">{admin?.full_name || 'Administrator'}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{admin?.email || 'admin@demo.com'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

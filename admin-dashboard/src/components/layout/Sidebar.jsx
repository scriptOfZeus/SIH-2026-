import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  CalendarCheck,
  Flame,
  TrendingUp,
  GitFork,
  Scale,
  HeartHandshake,
  Settings,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ currentTab, onSelectTab, counts = {} }) {
  const { logout, federation, isSuperAdmin } = useAuth();

  const navItems = [
    {
      id: 'overview',
      label: 'Dashboard Overview',
      icon: LayoutDashboard,
    },
    // Supervising Admin exclusive tab for managing federations
    ...(isSuperAdmin
      ? [
          {
            id: 'federations',
            label: 'Federation Management',
            icon: Building2,
            highlight: true,
          },
        ]
      : []),
    {
      id: 'workers',
      label: 'Worker Directory',
      icon: Users,
      badge: counts.totalWorkers,
    },
    {
      id: 'verification',
      label: 'Worker Verification & OCR',
      icon: ShieldCheck,
      badge: counts.pendingWorkers,
      badgeColor: 'bg-amber-500 text-white font-bold',
    },
    {
      id: 'bookings',
      label: 'Booking Management',
      icon: CalendarCheck,
      badge: counts.totalBookings,
    },
    {
      id: 'active-emergency',
      label: 'Live & Emergency Dispatch',
      icon: Flame,
      badge: counts.emergencyBookings,
      badgeColor: 'bg-red-500 text-white font-bold animate-pulse',
    },
    {
      id: 'operations-map',
      label: 'Operations Fleet Map',
      icon: ChevronRight,
      highlight: true,
    },
    {
      id: 'forecast',
      label: 'AI Demand Forecast',
      icon: TrendingUp,
      highlight: true,
    },
    {
      id: 'reallocation',
      label: 'Workforce Reallocation',
      icon: GitFork,
      highlight: true,
    },
    {
      id: 'disputes',
      label: 'Dispute Adjudication',
      icon: Scale,
      badge: counts.openDisputes,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'welfare',
      label: 'Welfare & Insurance',
      icon: HeartHandshake,
      badge: counts.pendingClaims,
      badgeColor: 'bg-blue-500 text-white',
    },
    {
      id: 'settings',
      label: 'Federation Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 text-lg">
            SS
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-tight leading-none">SAHKAR SEWA</h1>
            <p className="text-xs text-blue-400 font-semibold tracking-wider uppercase mt-1">
              {isSuperAdmin ? 'Supervising Admin' : 'Cooperative Admin'}
            </p>
          </div>
        </div>

        {federation && (
          <div className="mt-4 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{federation.name}</p>
              <p className="text-[10px] text-slate-400 capitalize">{federation.region || 'Active Region'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    item.badgeColor || (isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-800/80">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

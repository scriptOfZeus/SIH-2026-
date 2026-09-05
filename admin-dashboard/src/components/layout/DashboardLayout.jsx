import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout({ currentTab, onSelectTab, currentTabTitle, onRefresh, isRefreshing, counts, children }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-800">
      <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} counts={counts} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header currentTabTitle={currentTabTitle} onRefresh={onRefresh} isRefreshing={isRefreshing} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

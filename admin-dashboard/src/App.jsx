import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { Federations } from './pages/Federations';
import { Overview } from './pages/Overview';
import { Workers } from './pages/Workers';
import { WorkerVerification } from './pages/WorkerVerification';
import { Bookings } from './pages/Bookings';
import { ActiveEmergencyBookings } from './pages/ActiveEmergencyBookings';
import { OperationsMap } from './pages/OperationsMap';
import { DemandForecast } from './pages/DemandForecast';
import { Reallocation } from './pages/Reallocation';
import { Disputes } from './pages/Disputes';
import { WelfareInsurance } from './pages/WelfareInsurance';
import { Settings } from './pages/Settings';
import { analyticsApi } from './api/analytics';
import { workersApi } from './api/workers';
import { bookingsApi } from './api/bookings';
import { disputesApi } from './api/disputes';
import { welfareApi } from './api/welfare';
import { LoadingSpinner } from './components/common/FeedbackStates';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [counts, setCounts] = useState({
    totalWorkers: 0,
    pendingWorkers: 0,
    totalBookings: 0,
    emergencyBookings: 0,
    openDisputes: 0,
    pendingClaims: 0,
  });

  const refreshBadges = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [workers, bookings, disputesSummary, fundSummary] = await Promise.all([
        workersApi.getWorkers().catch(() => []),
        bookingsApi.getBookings().catch(() => []),
        disputesApi.getDisputesSummary().catch(() => null),
        welfareApi.getFundSummary().catch(() => null),
      ]);

      const wList = Array.isArray(workers) ? workers : [];
      const bList = Array.isArray(bookings) ? bookings : [];

      const openDisputes =
        disputesSummary?.status_counts
          ?.filter((s) => ['raised', 'under_review'].includes(s.status))
          ?.reduce((acc, curr) => acc + parseInt(curr.count, 10), 0) || 0;

      setCounts({
        totalWorkers: wList.length,
        pendingWorkers: wList.filter((w) => w.verification_status === 'pending').length,
        totalBookings: bList.length,
        emergencyBookings: bList.filter(
          (b) => (b.is_emergency == 1 || b.is_emergency === true) && b.status !== 'completed' && b.status !== 'cancelled'
        ).length,
        openDisputes,
        pendingClaims: fundSummary?.pending_claims || 0,
      });
    } catch {
      // Ignore count fetch errors
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshBadges();
      const interval = setInterval(refreshBadges, 20000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshBadges]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshBadges();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner text="Connecting to Sahkar Sewa Federation..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const tabTitles = {
    overview: 'Federation Overview',
    federations: 'Federation Network Management',
    workers: 'Worker Directory & Partners',
    verification: 'Worker Verification & OCR Safety',
    bookings: 'Service Booking Management',
    'active-emergency': 'Live & Emergency Dispatch Console',
    'operations-map': 'Geospatial Fleet & Operations Map',
    forecast: 'AI Demand Forecasting',
    reallocation: 'Workforce Reallocation Suggestions',
    disputes: 'Dispute Adjudication Console',
    welfare: 'Cooperative Welfare & Insurance',
    settings: 'Federation Parameters & Nodes',
  };

  return (
    <DashboardLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      currentTabTitle={tabTitles[currentTab] || 'Command Center'}
      onRefresh={handleManualRefresh}
      isRefreshing={isRefreshing}
      counts={counts}
    >
      {currentTab === 'overview' && <Overview onNavigate={setCurrentTab} />}
      {currentTab === 'federations' && <Federations />}
      {currentTab === 'workers' && <Workers onNavigateToVerification={() => setCurrentTab('verification')} />}
      {currentTab === 'verification' && <WorkerVerification />}
      {currentTab === 'bookings' && <Bookings />}
      {currentTab === 'active-emergency' && <ActiveEmergencyBookings />}
      {currentTab === 'operations-map' && <OperationsMap />}
      {currentTab === 'forecast' && (
        <DemandForecast onNavigateToReallocation={() => setCurrentTab('reallocation')} />
      )}
      {currentTab === 'reallocation' && <Reallocation />}
      {currentTab === 'disputes' && <Disputes />}
      {currentTab === 'welfare' && <WelfareInsurance />}
      {currentTab === 'settings' && <Settings />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}

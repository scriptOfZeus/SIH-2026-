/**
 * Centralized API & Route Configuration for Admin Dashboard
 * Strictly maps to backend routes (server.js / routes/*)
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth
  ADMIN_LOGIN: `${API_BASE_URL}/auth/admin/login`,
  CURRENT_FEDERATION: `${API_BASE_URL}/admin/federations/current`,

  // Worker Management
  ADMIN_WORKERS: `${API_BASE_URL}/admin/workers`,
  ADMIN_WORKER_VERIFY_CERTIFICATE: (id) => `${API_BASE_URL}/admin/workers/${id}/verify-certificate`,
  ADMIN_WORKER_VERIFY: (id) => `${API_BASE_URL}/admin/workers/${id}/verify`,
  ADMIN_WORKER_DOCUMENT: (id) => `${API_BASE_URL}/admin/workers/${id}/certificate-document`,
  ADMIN_WORKER_UPLOAD_CERTIFICATE: (id) => `${API_BASE_URL}/admin/workers/${id}/upload-certificate`,

  // Bookings
  ADMIN_BOOKINGS: `${API_BASE_URL}/admin/bookings`,
  BOOKING_DETAIL: (id) => `${API_BASE_URL}/bookings/${id}`,

  // Analytics & Demand Forecasting
  ANALYTICS_SUMMARY: `${API_BASE_URL}/admin/analytics/summary`,
  ANALYTICS_DEMAND_FORECAST: `${API_BASE_URL}/admin/analytics/demand-forecast`,
  ANALYTICS_REALLOCATION: `${API_BASE_URL}/admin/analytics/reallocation-suggestions`,
  ANALYTICS_HISTORICAL_DEMAND: `${API_BASE_URL}/admin/analytics/historical-demand`,
  ANALYTICS_ADVANCED_FORECAST: `${API_BASE_URL}/admin/analytics/advanced-forecast`,
  ANALYTICS_WORKFORCE_CAPACITY: `${API_BASE_URL}/admin/analytics/workforce-capacity`,
  ANALYTICS_ANOMALIES: `${API_BASE_URL}/admin/analytics/anomalies`,
  ANALYTICS_PEAK_DEMAND: `${API_BASE_URL}/admin/analytics/peak-demand`,
  ANALYTICS_GLOBAL_AI_OVERVIEW: `${API_BASE_URL}/admin/analytics/global-ai-overview`,
  ANALYTICS_FEDERATION_AI_OVERVIEW: `${API_BASE_URL}/admin/analytics/federation-ai-overview`,
  ANALYTICS_EXPLAIN: `${API_BASE_URL}/admin/analytics/explain`,

  // Federations (Phase 2.5)
  FEDERATIONS: `${API_BASE_URL}/admin/federations`,
  FEDERATION_DETAIL: (id) => `${API_BASE_URL}/admin/federations/${id}`,
  FEDERATION_ADMIN: (id) => `${API_BASE_URL}/admin/federations/${id}/admin`,

  // Forecasts (Phase 2.5)
  FORECASTS: `${API_BASE_URL}/admin/forecasts`,
  FORECASTS_GENERATE: `${API_BASE_URL}/admin/forecasts/generate`,
  FORECASTS_PUBLISH: `${API_BASE_URL}/admin/forecasts/publish`,
  CERTIFICATE_VERIFICATION_QUEUE: `${API_BASE_URL}/admin/certificate-verification`,

  // Welfare & Insurance
  ADMIN_WELFARE_POLICIES: `${API_BASE_URL}/admin/welfare/policies`,
  ADMIN_WELFARE_CLAIMS: `${API_BASE_URL}/admin/welfare/claims`,
  ADMIN_WELFARE_CLAIM_DETAIL: (id) => `${API_BASE_URL}/admin/welfare/claims/${id}`,
  ADMIN_WELFARE_ADJUDICATE_CLAIM: (id) => `${API_BASE_URL}/admin/welfare/claims/${id}/adjudicate`,
  ADMIN_WELFARE_FUND_SUMMARY: `${API_BASE_URL}/admin/welfare/fund-summary`,

  // Disputes
  ADMIN_DISPUTES: `${API_BASE_URL}/admin/disputes`,
  ADMIN_DISPUTES_SUMMARY: `${API_BASE_URL}/admin/disputes/summary`,
  ADMIN_DISPUTE_DETAIL: (id) => `${API_BASE_URL}/admin/disputes/${id}`,
  ADMIN_DISPUTE_REVIEW: (id) => `${API_BASE_URL}/admin/disputes/${id}/review`,
  ADMIN_DISPUTE_RESOLVE: (id) => `${API_BASE_URL}/admin/disputes/${id}/resolve`,

  // Geospatial Operations Map (Phase 3)
  GEO_LIVE_MAP: `${API_BASE_URL}/admin/geo/live-map`,
};

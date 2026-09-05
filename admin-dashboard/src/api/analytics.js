import { api } from './client';
import { API_ENDPOINTS } from '../config/api';

export const analyticsApi = {
  async getSummary() {
    return api.get(API_ENDPOINTS.ANALYTICS_SUMMARY);
  },

  async getDemandForecast(includeHotspots = true, params = {}) {
    const searchParams = new URLSearchParams({
      include_hotspots: includeHotspots ? 'true' : 'false',
      ...params,
    });
    return api.get(`${API_ENDPOINTS.ANALYTICS_DEMAND_FORECAST}?${searchParams.toString()}`);
  },

  async getAdvancedForecast(params = {}) {
    const searchParams = new URLSearchParams(params);
    return api.get(`${API_ENDPOINTS.ANALYTICS_ADVANCED_FORECAST}?${searchParams.toString()}`);
  },

  async getHistoricalDemand(params = {}) {
    const searchParams = new URLSearchParams(params);
    return api.get(`${API_ENDPOINTS.ANALYTICS_HISTORICAL_DEMAND}?${searchParams.toString()}`);
  },

  async getWorkforceCapacity(params = {}) {
    const searchParams = new URLSearchParams(params);
    return api.get(`${API_ENDPOINTS.ANALYTICS_WORKFORCE_CAPACITY}?${searchParams.toString()}`);
  },

  async getAnomalies(params = {}) {
    const searchParams = new URLSearchParams(params);
    return api.get(`${API_ENDPOINTS.ANALYTICS_ANOMALIES}?${searchParams.toString()}`);
  },

  async getPeakDemand(params = {}) {
    const searchParams = new URLSearchParams(params);
    return api.get(`${API_ENDPOINTS.ANALYTICS_PEAK_DEMAND}?${searchParams.toString()}`);
  },

  async getGlobalAiOverview() {
    return api.get(API_ENDPOINTS.ANALYTICS_GLOBAL_AI_OVERVIEW);
  },

  async getFederationAiOverview(federationId = null) {
    const param = federationId ? `?federation_id=${federationId}` : '';
    return api.get(`${API_ENDPOINTS.ANALYTICS_FEDERATION_AI_OVERVIEW}${param}`);
  },

  async explainForecast(payload = {}) {
    return api.post(API_ENDPOINTS.ANALYTICS_EXPLAIN, payload);
  },

  async getReallocationSuggestions(horizonDays = 7, federationId = null) {
    const params = new URLSearchParams({ horizon_days: horizonDays });
    if (federationId) params.append('federation_id', federationId);
    return api.get(`${API_ENDPOINTS.ANALYTICS_REALLOCATION}?${params.toString()}`);
  },
};

import { api } from './client';
import { API_ENDPOINTS } from '../config/api';

export const forecastsApi = {
  async getForecasts(federationId = null) {
    const url = federationId
      ? `${API_ENDPOINTS.FORECASTS}?federation_id=${encodeURIComponent(federationId)}`
      : API_ENDPOINTS.FORECASTS;
    return api.get(url);
  },

  async generateForecast(params) {
    return api.post(API_ENDPOINTS.FORECASTS_GENERATE, params);
  },

  async publishForecast(federationId, items) {
    return api.post(API_ENDPOINTS.FORECASTS_PUBLISH, {
      federation_id: federationId,
      items,
    });
  },
};

import { api } from './client';
import { API_ENDPOINTS } from '../config/api';

export const geoApi = {
  async getLiveMap(federationId = null) {
    const url = federationId
      ? `${API_ENDPOINTS.GEO_LIVE_MAP}?federation_id=${encodeURIComponent(federationId)}`
      : API_ENDPOINTS.GEO_LIVE_MAP;
    return api.get(url);
  },
};

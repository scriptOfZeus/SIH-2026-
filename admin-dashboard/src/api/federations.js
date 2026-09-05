import { api } from './client';
import { API_ENDPOINTS } from '../config/api';

export const federationsApi = {
  async getAll() {
    return api.get(API_ENDPOINTS.FEDERATIONS);
  },

  async getById(id) {
    return api.get(API_ENDPOINTS.FEDERATION_DETAIL(id));
  },

  async create(data) {
    return api.post(API_ENDPOINTS.FEDERATIONS, data);
  },

  async update(id, data) {
    return api.patch(API_ENDPOINTS.FEDERATION_DETAIL(id), data);
  },

  async assignAdmin(id, adminData) {
    return api.post(API_ENDPOINTS.FEDERATION_ADMIN(id), adminData);
  },
};

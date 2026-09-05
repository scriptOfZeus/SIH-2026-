import { api, setToken, setStoredAdmin, removeToken, removeStoredAdmin } from './client';
import { API_ENDPOINTS } from '../config/api';

export const authApi = {
  async login(email, password) {
    const data = await api.post(API_ENDPOINTS.ADMIN_LOGIN, { email, password });
    if (data?.token) {
      setToken(data.token);
      if (data.admin) {
        setStoredAdmin(data.admin);
      }
    }
    return data;
  },

  async getCurrentFederation() {
    return api.get(API_ENDPOINTS.CURRENT_FEDERATION);
  },

  logout() {
    removeToken();
    removeStoredAdmin();
  },
};

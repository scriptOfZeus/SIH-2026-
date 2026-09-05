import { api } from './client';
import { API_ENDPOINTS } from '../config/api';

export const workersApi = {
  async getWorkers(statusFilter = '') {
    const url = statusFilter
      ? `${API_ENDPOINTS.ADMIN_WORKERS}?verification_status=${encodeURIComponent(statusFilter)}`
      : API_ENDPOINTS.ADMIN_WORKERS;
    return api.get(url);
  },

  async createWorker(workerData) {
    return api.post(API_ENDPOINTS.ADMIN_WORKERS, workerData);
  },

  async getCertificateDocument(workerId) {
    return api.get(API_ENDPOINTS.ADMIN_WORKER_DOCUMENT(workerId));
  },

  async uploadAndVerifyCertificate(workerId, payload) {
    return api.post(API_ENDPOINTS.ADMIN_WORKER_UPLOAD_CERTIFICATE(workerId), payload);
  },

  async verifyCertificate(workerId, overrideMismatch = false, extra = {}) {
    return api.patch(API_ENDPOINTS.ADMIN_WORKER_VERIFY_CERTIFICATE(workerId), {
      override_mismatch: overrideMismatch,
      ...extra,
    });
  },

  async setVerificationStatus(workerId, decision, notes = '') {
    // decision: 'approved' | 'rejected'
    return api.patch(API_ENDPOINTS.ADMIN_WORKER_VERIFY(workerId), { decision, notes });
  },
};

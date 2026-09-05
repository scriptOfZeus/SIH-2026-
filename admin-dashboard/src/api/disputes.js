import { api } from './client';
import { API_ENDPOINTS } from '../config/api';

export const disputesApi = {
  async getDisputes() {
    return api.get(API_ENDPOINTS.ADMIN_DISPUTES);
  },

  async getDisputesSummary() {
    return api.get(API_ENDPOINTS.ADMIN_DISPUTES_SUMMARY);
  },

  async getDisputeDetail(disputeId) {
    return api.get(API_ENDPOINTS.ADMIN_DISPUTE_DETAIL(disputeId));
  },

  async reviewDispute(disputeId) {
    return api.patch(API_ENDPOINTS.ADMIN_DISPUTE_REVIEW(disputeId));
  },

  async resolveDispute(disputeId, { resolution_action, resolution_notes, refund_amount }) {
    return api.patch(API_ENDPOINTS.ADMIN_DISPUTE_RESOLVE(disputeId), {
      resolution_action,
      resolution_notes,
      refund_amount,
    });
  },
};

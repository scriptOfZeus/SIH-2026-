import { api } from './client';
import { API_ENDPOINTS } from '../config/api';

export const welfareApi = {
  async getFundSummary() {
    return api.get(API_ENDPOINTS.ADMIN_WELFARE_FUND_SUMMARY);
  },

  async getPolicies() {
    return api.get(API_ENDPOINTS.ADMIN_WELFARE_POLICIES);
  },

  async getClaims(statusFilter = '') {
    const url = statusFilter
      ? `${API_ENDPOINTS.ADMIN_WELFARE_CLAIMS}?status=${encodeURIComponent(statusFilter)}`
      : API_ENDPOINTS.ADMIN_WELFARE_CLAIMS;
    return api.get(url);
  },

  async getClaimDetail(claimId) {
    return api.get(API_ENDPOINTS.ADMIN_WELFARE_CLAIM_DETAIL(claimId));
  },

  async adjudicateClaim(claimId, { decision, amount_approved, admin_notes }) {
    return api.patch(API_ENDPOINTS.ADMIN_WELFARE_ADJUDICATE_CLAIM(claimId), {
      decision,
      amount_approved,
      admin_notes,
    });
  },

  async getFinancialSummary(federationId = '') {
    const url = federationId ? `/admin/financial-summary?federation_id=${encodeURIComponent(federationId)}` : '/admin/financial-summary';
    return api.get(url);
  },

  async getPayoutLedger(federationId = '') {
    const url = federationId ? `/admin/payouts?federation_id=${encodeURIComponent(federationId)}` : '/admin/payouts';
    return api.get(url);
  },

  async getServices(category = '', search = '') {
    let url = '/admin/services?';
    if (category) url += `category=${encodeURIComponent(category)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    return api.get(url);
  },
};

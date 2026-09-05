import { api } from './client';
import { API_ENDPOINTS } from '../config/api';

export const bookingsApi = {
  async getBookings(statusFilter = '') {
    const url = statusFilter
      ? `${API_ENDPOINTS.ADMIN_BOOKINGS}?status=${encodeURIComponent(statusFilter)}`
      : API_ENDPOINTS.ADMIN_BOOKINGS;
    return api.get(url);
  },

  async getBookingDetail(bookingId) {
    return api.get(API_ENDPOINTS.BOOKING_DETAIL(bookingId));
  },
};

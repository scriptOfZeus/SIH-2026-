import '../config/api_config.dart';
import '../models/earnings_model.dart';
import '../models/worker_booking_model.dart';
import 'api_client.dart';

class WorkerBookingService {
  static Future<List<WorkerBooking>> getMyBookings() async {
    try {
      final res = await ApiClient.get(ApiConfig.myBookings);
      if (res is List) {
        return res.map((item) => WorkerBooking.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      // Fallback
    }
    return [];
  }

  static Future<WorkerBooking?> getBookingDetail(String id) async {
    try {
      final res = await ApiClient.get(ApiConfig.bookingDetail(id));
      if (res is Map<String, dynamic>) {
        return WorkerBooking.fromJson(res);
      }
    } catch (_) {
      // Fallback
    }
    return null;
  }

  static Future<WorkerBooking?> acceptBooking(String id) async {
    final res = await ApiClient.patch(ApiConfig.acceptBooking(id));
    if (res is Map<String, dynamic>) {
      // Backend may return { booking: {...} } or booking object directly
      final bookingData = res['booking'] ?? res;
      if (bookingData is Map<String, dynamic>) {
        return WorkerBooking.fromJson(bookingData);
      }
    }
    return null;
  }

  static Future<bool> rejectBooking(String id) async {
    try {
      await ApiClient.patch(ApiConfig.rejectBooking(id));
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<WorkerBooking?> completeBooking(String id, {double? partsFee, String? notes}) async {
    final res = await ApiClient.patch(
      ApiConfig.completeBooking(id),
      body: {
        if (partsFee != null) 'parts_fee': partsFee,
        if (notes != null) 'service_notes': notes,
      },
    );
    if (res is Map<String, dynamic>) {
      return WorkerBooking.fromJson(res);
    }
    return null;
  }

  static Future<WorkerEarningsSummary?> getEarningsSummary() async {
    try {
      final res = await ApiClient.get(ApiConfig.workerEarnings);
      if (res is Map<String, dynamic>) {
        return WorkerEarningsSummary.fromJson(res);
      }
    } catch (_) {
      // Fallback handled by provider
    }
    return null;
  }
}

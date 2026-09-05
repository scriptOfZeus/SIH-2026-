import '../config/api_config.dart';
import '../models/booking_model.dart';
import '../models/rating_model.dart';
import '../models/worker_model.dart';
import 'api_client.dart';

class BookingService {
  static Future<List<WorkerModel>> getNearbyWorkers({
    required double lat,
    required double lng,
    String skillCategory = 'electrician',
    double radiusKm = 15.0,
  }) async {
    final query = <String, String>{
      'lat': lat.toString(),
      'lng': lng.toString(),
      'radius_km': radiusKm.toString(),
      'skill_category': skillCategory.isNotEmpty ? skillCategory : 'electrician',
    };

    final uri = Uri.parse(ApiConfig.workersNearby).replace(queryParameters: query);
    final res = await ApiClient.get(uri.toString());

    if (res is Map && res['workers'] is List) {
      return (res['workers'] as List)
          .map((item) => WorkerModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    if (res is List) {
      return res.map((item) => WorkerModel.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  static Future<BookingModel> createScheduledBooking({
    required String skillCategory,
    required String serviceAddress,
    required double serviceLat,
    required double serviceLng,
    required String scheduledTime,
    String? workerId,
  }) async {
    final res = await ApiClient.post(
      ApiConfig.bookings,
      body: {
        'skill_category': skillCategory,
        'service_address': serviceAddress,
        'service_lat': serviceLat,
        'service_lng': serviceLng,
        'scheduled_time': scheduledTime,
        if (workerId != null) 'worker_id': workerId,
      },
    );
    return BookingModel.fromJson(res as Map<String, dynamic>);
  }

  static Future<BookingModel> createEmergencyBooking({
    required String skillCategory,
    required String serviceAddress,
    required double serviceLat,
    required double serviceLng,
    double emergencyFee = 50.0,
    int timeoutSeconds = 60,
  }) async {
    final res = await ApiClient.post(
      ApiConfig.emergencyBooking,
      body: {
        'skill_category': skillCategory,
        'service_address': serviceAddress,
        'service_lat': serviceLat,
        'service_lng': serviceLng,
        'emergency_fee': emergencyFee,
        'timeout_seconds': timeoutSeconds,
      },
    );
    if (res is Map<String, dynamic>) {
      if (res.containsKey('booking') && res['booking'] is Map<String, dynamic>) {
        return BookingModel.fromJson(res['booking'] as Map<String, dynamic>);
      }
      return BookingModel.fromJson(res);
    }
    throw ApiException('Invalid emergency booking response format');
  }

  static Future<List<BookingModel>> getMyBookings() async {
    final res = await ApiClient.get(ApiConfig.myBookings);
    if (res is List) {
      return res.map((item) => BookingModel.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  static Future<BookingModel> getBookingDetail(String id) async {
    final res = await ApiClient.get(ApiConfig.bookingDetail(id));
    return BookingModel.fromJson(res as Map<String, dynamic>);
  }

  static Future<BookingModel> completeBooking(String id) async {
    final res = await ApiClient.patch(ApiConfig.completeBooking(id));
    return BookingModel.fromJson(res as Map<String, dynamic>);
  }

  static Future<BookingModel> cancelBooking(String id) async {
    final res = await ApiClient.patch(ApiConfig.cancelBooking(id));
    return BookingModel.fromJson(res as Map<String, dynamic>);
  }

  static Future<List<RatingModel>> getWorkerRatings(String workerId) async {
    final res = await ApiClient.get('${ApiConfig.baseUrl}/ratings/worker/$workerId');
    if (res is List) {
      return res.map((item) => RatingModel.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }
}

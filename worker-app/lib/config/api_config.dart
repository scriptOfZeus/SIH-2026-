import 'package:flutter/foundation.dart';

/// Centralized Backend API Configuration for Worker Mobile App.
/// Matches the current-updated-backend REST endpoints and schema exactly.
class ApiConfig {
  static String get baseHost {
    if (kIsWeb) {
      return 'http://localhost:5000';
    }
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:5000';
    }
    return 'http://localhost:5000';
  }

  static String get baseUrl => '$baseHost/api/v1';
  static String get socketUrl => baseHost;

  // Auth endpoints
  static String get otpRequest => '$baseUrl/auth/otp/request';
  static String get otpVerify => '$baseUrl/auth/otp/verify';

  // Worker endpoints
  static String get workerMe => '$baseUrl/workers/me';
  static String get workerUploadCertificate => '$baseUrl/workers/me/upload-certificate';
  static String get workersNearby => '$baseUrl/workers/nearby';
  static String get workerEarnings => '$baseUrl/workers/me/earnings';

  // Booking lifecycle
  static String get bookings => '$baseUrl/bookings';
  static String get emergencyBooking => '$baseUrl/bookings/emergency';
  static String get myBookings => '$baseUrl/bookings/mine/list';
  static String bookingDetail(String id) => '$baseUrl/bookings/$id';
  static String acceptBooking(String id) => '$baseUrl/bookings/$id/accept';
  static String rejectBooking(String id) => '$baseUrl/bookings/$id/reject';
  static String completeBooking(String id) => '$baseUrl/bookings/$id/complete';
  static String cancelBooking(String id) => '$baseUrl/bookings/$id/cancel';

  // GPS Telemetry & Tracking
  static String bookingLocation(String id) => '$baseUrl/bookings/$id/location';
  static String get trackingPush => '$baseUrl/tracking/push';

  // Ratings
  static String get submitRating => '$baseUrl/ratings';
  static String workerRatings(String id) => '$baseUrl/ratings/worker/$id';

  // Welfare & Policies
  static String get welfarePolicies => '$baseUrl/welfare/policies';
  static String get welfareEnroll => '$baseUrl/welfare/enroll';
  static String get myWelfareEnrollments => '$baseUrl/welfare/my-enrollments';
  static String get submitWelfareClaim => '$baseUrl/welfare/claims';
  static String get myWelfareClaims => '$baseUrl/welfare/my-claims';

  // Disputes
  static String get disputes => '$baseUrl/disputes';
  static String disputeDetail(String id) => '$baseUrl/disputes/$id';
  static String disputeEvidence(String id) => '$baseUrl/disputes/$id/evidence';
}

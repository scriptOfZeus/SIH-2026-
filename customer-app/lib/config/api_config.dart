import 'package:flutter/foundation.dart';

/// Centralized Backend API Configuration for Customer Mobile App.
/// Matches the current-updated-backend REST endpoints and schema exactly.
class ApiConfig {
  // Base configuration - automatically resolves 10.0.2.2 on Android emulator vs localhost on Web
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

  // Customer endpoints
  static String get customerRegister => '$baseUrl/customers/register';
  static String get customerMe => '$baseUrl/customers/me';

  // Worker discovery
  static String get workersNearby => '$baseUrl/workers/nearby';

  // Booking lifecycle
  static String get bookings => '$baseUrl/bookings';
  static String get emergencyBooking => '$baseUrl/bookings/emergency';
  static String get myBookings => '$baseUrl/bookings/mine/list';
  static String bookingDetail(String id) => '$baseUrl/bookings/$id';
  static String completeBooking(String id) => '$baseUrl/bookings/$id/complete';
  static String cancelBooking(String id) => '$baseUrl/bookings/$id/cancel';

  // Tracking & GPS
  static String trackingConsent(String id) => '$baseUrl/bookings/$id/consent-tracking';
  static String get tracking => '$baseUrl/tracking';

  // Payments & Invoicing
  static String get initiatePayment => '$baseUrl/payments/initiate';
  static String get submitRating => '$baseUrl/ratings';

  // Disputes
  static String get disputes => '$baseUrl/disputes';
  static String disputeDetail(String id) => '$baseUrl/disputes/$id';
}

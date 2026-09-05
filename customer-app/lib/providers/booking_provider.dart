import 'package:flutter/material.dart';
import '../models/booking_model.dart';
import '../models/payment_model.dart';
import '../models/worker_model.dart';
import '../services/booking_service.dart';
import '../services/payment_service.dart';
import '../services/rating_service.dart';

class BookingProvider extends ChangeNotifier {
  List<WorkerModel> _nearbyWorkers = [];
  List<BookingModel> _myBookings = [];
  BookingModel? _activeBooking;
  PaymentModel? _currentPayment;
  bool _isLoading = false;
  String? _errorMessage;

  // Active filters
  String _selectedCategory = 'electrician';
  String _selectedFilterTab = 'All'; // All, Upcoming, Active, Completed

  List<WorkerModel> get nearbyWorkers => _nearbyWorkers;
  List<BookingModel> get myBookings => _myBookings;
  BookingModel? get activeBooking => _activeBooking;
  PaymentModel? get currentPayment => _currentPayment;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get selectedCategory => _selectedCategory;
  String get selectedFilterTab => _selectedFilterTab;

  List<BookingModel> get filteredBookings {
    switch (_selectedFilterTab) {
      case 'Upcoming':
        return _myBookings.where((b) => b.isUpcoming).toList();
      case 'Active':
        return _myBookings.where((b) => b.isActive).toList();
      case 'Completed':
        return _myBookings.where((b) => b.isCompleted).toList();
      default:
        return _myBookings;
    }
  }

  void setSelectedCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void setSelectedFilterTab(String tab) {
    _selectedFilterTab = tab;
    notifyListeners();
  }

  Future<void> fetchNearbyWorkers({
    double lat = 22.5726,
    double lng = 88.3639,
    String? category,
    double radiusKm = 15.0,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final skill = category ?? _selectedCategory;
      _nearbyWorkers = await BookingService.getNearbyWorkers(
        lat: lat,
        lng: lng,
        skillCategory: skill,
        radiusKm: radiusKm,
      );
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<BookingModel?> createScheduledBooking({
    required String skillCategory,
    required String serviceAddress,
    required double serviceLat,
    required double serviceLng,
    required String scheduledTime,
    String? workerId,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final booking = await BookingService.createScheduledBooking(
        skillCategory: skillCategory,
        serviceAddress: serviceAddress,
        serviceLat: serviceLat,
        serviceLng: serviceLng,
        scheduledTime: scheduledTime,
        workerId: workerId,
      );
      _activeBooking = booking;
      await fetchMyBookings();
      _isLoading = false;
      notifyListeners();
      return booking;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<BookingModel?> createEmergencyBooking({
    required String skillCategory,
    required String serviceAddress,
    required double serviceLat,
    required double serviceLng,
    double emergencyFee = 50.0,
    int timeoutSeconds = 60,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final booking = await BookingService.createEmergencyBooking(
        skillCategory: skillCategory,
        serviceAddress: serviceAddress,
        serviceLat: serviceLat,
        serviceLng: serviceLng,
        emergencyFee: emergencyFee,
        timeoutSeconds: timeoutSeconds,
      );
      _activeBooking = booking;
      await fetchMyBookings();
      _isLoading = false;
      notifyListeners();
      return booking;
    } catch (e) {
      final err = e.toString().replaceAll('Exception: ', '').replaceAll('ApiException: ', '');
      if (err.toLowerCase().contains('rate limit')) {
        _errorMessage = 'Emergency booking rate limit. Please wait a few seconds before submitting again.';
      } else {
        _errorMessage = err.isNotEmpty ? err : 'No emergency workers are currently available nearby. Try again shortly or schedule a normal booking.';
      }
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<void> fetchMyBookings() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _myBookings = await BookingService.getMyBookings();
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<BookingModel?> fetchBookingDetail(String id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final booking = await BookingService.getBookingDetail(id);
      _activeBooking = booking;
      _isLoading = false;
      notifyListeners();
      return booking;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<bool> completeBooking(String id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final updated = await BookingService.completeBooking(id);
      _activeBooking = updated;
      await fetchMyBookings();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<PaymentModel?> initiatePayment({
    required String bookingId,
    required double amount,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final payment = await PaymentService.initiatePayment(
        bookingId: bookingId,
        amount: amount,
      );
      _currentPayment = payment;
      await fetchMyBookings();
      _isLoading = false;
      notifyListeners();
      return payment;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<PaymentModel?> fetchPaymentReceipt(String bookingId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final payment = await PaymentService.getPaymentReceipt(bookingId);
      _currentPayment = payment;
      _isLoading = false;
      notifyListeners();
      return payment;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<bool> submitRating({
    required String bookingId,
    required int rating,
    String? comment,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await RatingService.submitRating(
        bookingId: bookingId,
        rating: rating,
        comment: comment,
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}

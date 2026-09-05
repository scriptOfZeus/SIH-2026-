import 'dart:async';
import 'package:flutter/material.dart';
import '../models/worker_booking_model.dart';
import '../services/worker_booking_service.dart';

class WorkerBookingProvider with ChangeNotifier {
  List<WorkerBooking> _bookings = [];
  WorkerBooking? _activeBooking;
  WorkerBooking? _incomingRequest;
  bool _isLoading = false;
  String? _errorMessage;

  // Emergency countdown state (60s dispatch window)
  int _emergencyCountdownSeconds = 60;
  Timer? _emergencyTimer;

  List<WorkerBooking> get bookings => _bookings;
  WorkerBooking? get activeBooking => _activeBooking;
  WorkerBooking? get incomingRequest => _incomingRequest;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get emergencyCountdownSeconds => _emergencyCountdownSeconds;

  List<WorkerBooking> get pendingRequests =>
      _bookings.where((b) => b.isPending).toList();

  List<WorkerBooking> get activeJobs =>
      _bookings.where((b) => b.isActive).toList();

  List<WorkerBooking> get completedJobs =>
      _bookings.where((b) => b.isCompleted).toList();

  List<WorkerBooking> get emergencyJobs =>
      _bookings.where((b) => b.isEmergency).toList();

  void _setupDefaultMockData() {
    _incomingRequest = WorkerBooking(
      id: 'emg-req-01',
      shortCode: 'BK1416',
      customerId: 'c-priya-01',
      customerName: 'Priya M.',
      customerPhone: '+91 98765 43210',
      customerRating: 4.9,
      serviceAddress: 'HSR Layout, Sector 2, Bangalore',
      skillCategory: 'electrician',
      status: 'requested',
      scheduledTime: 'immediate',
      isEmergency: true,
      emergencyFee: 50.0,
      laborRate: 850.0,
      totalAmount: 850.0,
      problemDescription: 'Main circuit breaker keeps tripping, house has no power',
      distanceKm: 1.2,
      estimatedDuration: 'ASAP',
      customerNote: 'Main gate is on the left side. Urgent power failure.',
      createdAt: DateTime.now().toIso8601String(),
    );

    _bookings = [
      if (_incomingRequest != null) _incomingRequest!,
      WorkerBooking(
        id: 'bk-std-01',
        shortCode: 'BK7800',
        customerId: 'c-rahul-02',
        customerName: 'Rahul Sharma',
        customerPhone: '+91 98765 43210',
        customerRating: 4.8,
        serviceAddress: '42, Palm Grove Apartments, Koramangala 4th Block',
        skillCategory: 'electrician',
        status: 'requested',
        scheduledTime: 'Today, 2:30 PM',
        isEmergency: false,
        laborRate: 600.0,
        emergencyFee: 0.0,
        platformFee: 50.0,
        totalAmount: 650.0,
        problemDescription: 'Main circuit breaker keeps tripping when AC is turned on.',
        distanceKm: 2.4,
        estimatedDuration: '1.5 - 2 hrs',
        createdAt: DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
      ),
      WorkerBooking(
        id: 'bk-comp-01',
        shortCode: 'BK9021',
        customerId: 'c-sarah-01',
        customerName: 'Sarah Jenkins',
        customerPhone: '+91 98765 43210',
        customerRating: 4.9,
        serviceAddress: '4820 Skyline Blvd, Building C, Unit 204',
        skillCategory: 'electrician',
        status: 'completed',
        scheduledTime: 'Yesterday, 10:00 AM',
        isEmergency: false,
        laborRate: 850.0,
        partsFee: 0.0,
        platformFee: 50.0,
        totalAmount: 850.0,
        problemDescription: 'Deep electrical maintenance and switchboard check.',
        distanceKm: 1.8,
        estimatedDuration: '1h 30m',
        completedByWorker: true,
        completedByCustomer: true,
        createdAt: DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
      ),
    ];
  }

  Future<void> fetchBookings() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final list = await WorkerBookingService.getMyBookings();
      if (list.isNotEmpty) {
        _bookings = list;
        // Check for active job
        try {
          _activeBooking = _bookings.firstWhere((b) => b.isActive);
        } catch (_) {
          _activeBooking = null;
        }
        // Check for incoming request
        try {
          _incomingRequest = _bookings.firstWhere((b) => b.isPending);
          if (_incomingRequest?.isEmergency == true) {
            startEmergencyTimer();
          }
        } catch (_) {
          // keep existing if any
        }
      } else {
        if (_bookings.isEmpty) {
          _setupDefaultMockData();
        }
      }
    } catch (e) {
      _errorMessage = e.toString();
      if (_bookings.isEmpty) {
        _setupDefaultMockData();
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  void startEmergencyTimer() {
    _emergencyTimer?.cancel();
    _emergencyCountdownSeconds = 60;
    _emergencyTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_emergencyCountdownSeconds > 0) {
        _emergencyCountdownSeconds--;
        notifyListeners();
      } else {
        timer.cancel();
        // Expired
        if (_incomingRequest != null && _incomingRequest!.isPending) {
          rejectBooking(_incomingRequest!.id);
        }
      }
    });
  }

  void clearEmergencyTimer() {
    _emergencyTimer?.cancel();
    _emergencyTimer = null;
  }

  Future<bool> acceptBooking(String id) async {
    _isLoading = true;
    _errorMessage = null;
    clearEmergencyTimer();
    notifyListeners();

    try {
      final updated = await WorkerBookingService.acceptBooking(id);
      final index = _bookings.indexWhere((b) => b.id == id);
      final acceptedBooking = updated ??
          (_bookings.isNotEmpty && index != -1
              ? _bookings[index].copyWith(status: 'accepted')
              : _incomingRequest?.copyWith(status: 'accepted'));

      if (acceptedBooking != null) {
        _activeBooking = acceptedBooking;
        if (index != -1) {
          _bookings[index] = acceptedBooking;
        } else {
          _bookings.insert(0, acceptedBooking);
        }
        if (_incomingRequest?.id == id) {
          _incomingRequest = null;
        }
      }

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

  Future<bool> rejectBooking(String id) async {
    clearEmergencyTimer();
    try {
      await WorkerBookingService.rejectBooking(id);
      _bookings.removeWhere((b) => b.id == id);
      if (_incomingRequest?.id == id) {
        _incomingRequest = null;
      }
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _bookings.removeWhere((b) => b.id == id);
      if (_incomingRequest?.id == id) {
        _incomingRequest = null;
      }
      notifyListeners();
      return false;
    }
  }

  Future<void> advanceActiveJobStatus(String newStatus) async {
    if (_activeBooking != null) {
      _activeBooking = _activeBooking!.copyWith(status: newStatus);
      final index = _bookings.indexWhere((b) => b.id == _activeBooking!.id);
      if (index != -1) {
        _bookings[index] = _activeBooking!;
      }
      notifyListeners();
    }
  }

  Future<bool> completeActiveJob({
    required String id,
    double partsFee = 0.0,
    String? serviceNotes,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await WorkerBookingService.completeBooking(
        id,
        partsFee: partsFee,
        notes: serviceNotes,
      );

      final total = (_activeBooking?.laborRate ?? 850.0) + partsFee;
      final completed = res ??
          _activeBooking?.copyWith(
            status: 'completed',
            partsFee: partsFee,
            totalAmount: total,
            serviceNotes: serviceNotes,
            completedByWorker: true,
          );

      if (completed != null) {
        final index = _bookings.indexWhere((b) => b.id == id);
        if (index != -1) {
          _bookings[index] = completed;
        }
        _activeBooking = null;
      }

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

  void setActiveBooking(WorkerBooking? booking) {
    _activeBooking = booking;
    notifyListeners();
  }

  @override
  void dispose() {
    clearEmergencyTimer();
    super.dispose();
  }
}

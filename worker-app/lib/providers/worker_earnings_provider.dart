import 'package:flutter/material.dart';
import '../models/earnings_model.dart';

import '../services/worker_booking_service.dart';

class WorkerEarningsProvider with ChangeNotifier {
  WorkerEarningsSummary _summary = WorkerEarningsSummary();
  String _selectedPeriod = 'Week'; // 'Today' | 'Week' | 'Month'
  bool _isLoading = false;
  String? _errorMessage;

  WorkerEarningsSummary get summary => _summary;
  String get selectedPeriod => _selectedPeriod;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  double get currentPeriodEarnings {
    switch (_selectedPeriod) {
      case 'Today':
        return _summary.todayEarnings;
      case 'Month':
        return _summary.monthlyEarnings;
      case 'Week':
      default:
        return _summary.weeklyEarnings;
    }
  }

  void setPeriod(String period) {
    _selectedPeriod = period;
    notifyListeners();
  }

  Future<void> fetchEarnings() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await WorkerBookingService.getEarningsSummary();
      if (data != null) {
        _summary = data;
      }
    } catch (e) {
      _errorMessage = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> withdrawToBank() async {
    _isLoading = true;
    notifyListeners();

    _isLoading = false;
    notifyListeners();
    return true;
  }
}

import 'package:flutter/material.dart';
import '../models/worker_profile_model.dart';
import '../services/worker_service.dart';

class WorkerProfileProvider with ChangeNotifier {
  WorkerProfile? _profile;
  bool _isLoading = false;
  String? _errorMessage;

  WorkerProfile? get profile => _profile;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  bool get isAvailable => _profile?.isAvailable ?? true;
  String get workerName => _profile?.fullName ?? 'Rahul Sharma';
  String get tradeSkill => _profile?.skillCategory.toUpperCase() ?? 'ELECTRICIAN';
  bool get isVerified => _profile?.isApproved ?? false;

  Future<void> fetchProfile() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final p = await WorkerService.getProfile();
      if (p != null) {
        _profile = p;
      } else {
        _profile = WorkerProfile(
          id: 'w-kolkata-01',
          fullName: 'Rahul Sharma',
          phone: '+91 98765 43210',
          skillCategory: 'electrician',
          isAvailable: true,
          verificationStatus: 'approved',
        );
      }
    } catch (e) {
      _errorMessage = e.toString();
      _profile ??= WorkerProfile(
        id: 'w-kolkata-01',
        fullName: 'Rahul Sharma',
        phone: '+91 98765 43210',
        skillCategory: 'electrician',
        isAvailable: true,
        verificationStatus: 'approved',
      );
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> toggleAvailability(bool value) async {
    if (_profile != null) {
      _profile = _profile!.copyWith(isAvailable: value);
      notifyListeners();
      await WorkerService.setAvailability(value);
    }
  }

  Future<void> updateProfile({
    String? fullName,
    String? skillCategory,
    double? hourlyRate,
    int? experienceYears,
    String? address,
    String? pincode,
    List<String>? specialties,
  }) async {
    if (_profile != null) {
      _profile = _profile!.copyWith(
        fullName: fullName,
        skillCategory: skillCategory,
        hourlyRate: hourlyRate,
        experienceYears: experienceYears,
        address: address,
        pincode: pincode,
        specialties: specialties,
      );
      notifyListeners();
    }

    await WorkerService.updateProfile(
      fullName: fullName,
      skillCategory: skillCategory,
      hourlyRate: hourlyRate,
      experienceYears: experienceYears,
      address: address,
      pincode: pincode,
    );
  }
}

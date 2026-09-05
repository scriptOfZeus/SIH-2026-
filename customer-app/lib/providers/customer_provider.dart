import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/customer_service.dart';
import '../services/storage_service.dart';

class CustomerProvider extends ChangeNotifier {
  UserModel? _profile;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get profile => _profile;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get hasCompletedProfile => _profile != null && _profile!.fullName != null && _profile!.fullName!.isNotEmpty;

  Future<void> fetchProfile() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _profile = await CustomerService.getProfile();
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> registerProfile({
    required String fullName,
    required String defaultAddress,
    double? defaultLat,
    double? defaultLng,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _profile = await CustomerService.registerProfile(
        fullName: fullName,
        defaultAddress: defaultAddress,
        defaultLat: defaultLat,
        defaultLng: defaultLng,
      );
      await StorageService.saveSession(
        token: (await StorageService.getToken()) ?? '',
        userId: _profile!.id,
        phone: _profile!.phone,
        name: _profile!.fullName,
        address: _profile!.defaultAddress,
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

  Future<bool> updateProfile({
    String? fullName,
    String? defaultAddress,
    double? defaultLat,
    double? defaultLng,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _profile = await CustomerService.updateProfile(
        fullName: fullName,
        defaultAddress: defaultAddress,
        defaultLat: defaultLat,
        defaultLng: defaultLng,
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

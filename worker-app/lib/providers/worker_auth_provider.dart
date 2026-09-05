import 'package:flutter/material.dart';
import '../services/storage_service.dart';
import '../services/worker_auth_service.dart';

class WorkerAuthProvider with ChangeNotifier {
  bool _isInitializing = true;
  bool _isLoading = false;
  String? _errorMessage;
  String? _currentPhone;
  bool _isLoggedIn = false;

  bool _isNewWorker = false;
  bool _isProfileCompleted = true;
  Map<String, dynamic>? _workerData;

  bool get isInitializing => _isInitializing;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get currentPhone => _currentPhone;
  bool get isLoggedIn => _isLoggedIn;
  bool get isNewWorker => _isNewWorker;
  bool get isProfileCompleted => _isProfileCompleted;
  Map<String, dynamic>? get workerData => _workerData;

  Future<void> checkAuthStatus() async {
    _isInitializing = true;
    notifyListeners();

    _isLoggedIn = await WorkerAuthService.isLoggedIn();
    _currentPhone = await StorageService.getPhone();

    _isInitializing = false;
    notifyListeners();
  }

  String _selectedRole = 'worker';
  String get selectedRole => _selectedRole;

  void setSelectedRole(String role) {
    _selectedRole = role;
    notifyListeners();
  }

  Future<bool> requestOtp(String phone, {String? role}) async {
    _isLoading = true;
    _errorMessage = null;
    if (role != null) _selectedRole = role;
    notifyListeners();

    try {
      final cleanPhone = phone.trim();
      _currentPhone = cleanPhone;
      await WorkerAuthService.requestOtp(cleanPhone, role: _selectedRole);
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

  Future<bool> verifyOtp(String code, {String? role}) async {
    if (_currentPhone == null || _currentPhone!.isEmpty) {
      _errorMessage = 'Phone number missing. Please request OTP again.';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    final targetRole = role ?? _selectedRole;
    notifyListeners();

    try {
      final res = await WorkerAuthService.verifyOtp(
        phone: _currentPhone!,
        code: code,
        role: targetRole,
      );

      final token = res['token']?.toString() ?? '';
      if (token.isNotEmpty) {
        _isLoggedIn = true;
        _workerData = (res['worker'] is Map<String, dynamic>)
            ? res['worker'] as Map<String, dynamic>
            : null;

        final isNew = res['is_new'] == true ||
            (targetRole == 'independent_worker' &&
                (_workerData?['full_name'] == 'Independent Partner' ||
                    _workerData?['skill_category'] == 'general' ||
                    res['profile_completed'] == false));

        _isNewWorker = isNew;
        _isProfileCompleted = res['profile_completed'] == true && !isNew;

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Invalid verification code';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await WorkerAuthService.logout();
    _isLoggedIn = false;
    _currentPhone = null;
    _isNewWorker = false;
    _isProfileCompleted = true;
    _workerData = null;
    notifyListeners();
  }
}

import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';

enum AuthState { uninitialized, unauthenticated, authenticated }

class AuthProvider extends ChangeNotifier {
  AuthState _state = AuthState.uninitialized;
  UserModel? _user;
  bool _isLoading = false;
  String? _errorMessage;

  AuthState get state => _state;
  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _state == AuthState.authenticated;

  Future<void> initAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await StorageService.getToken();
      final userId = await StorageService.getUserId();
      final phone = await StorageService.getUserPhone();
      final name = await StorageService.getUserName();
      final address = await StorageService.getUserAddress();

      if (token != null && userId != null && phone != null) {
        _user = UserModel(
          id: userId,
          phone: phone,
          fullName: name,
          defaultAddress: address,
        );
        _state = AuthState.authenticated;
      } else {
        _state = AuthState.unauthenticated;
      }
    } catch (_) {
      _state = AuthState.unauthenticated;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> requestOtp(String phone) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await AuthService.requestOtp(phone);
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

  Future<bool> verifyOtp({required String phone, required String code}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _user = await AuthService.verifyOtp(phone: phone, code: code);
      _state = AuthState.authenticated;
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

  void setUser(UserModel user) {
    _user = user;
    notifyListeners();
  }

  Future<void> logout() async {
    await AuthService.logout();
    _user = null;
    _state = AuthState.unauthenticated;
    notifyListeners();
  }
}

import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _tokenKey = 'worker_auth_token';
  static const String _workerIdKey = 'worker_id';
  static const String _workerPhoneKey = 'worker_phone';
  static const String _isAvailableKey = 'worker_is_available';

  static Future<void> saveAuth({
    required String token,
    required String workerId,
    required String phone,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_workerIdKey, workerId);
    await prefs.setString(_workerPhoneKey, phone);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<String?> getWorkerId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_workerIdKey);
  }

  static Future<String?> getPhone() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_workerPhoneKey);
  }

  static Future<bool> isAvailable() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_isAvailableKey) ?? true;
  }

  static Future<void> setAvailability(bool available) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_isAvailableKey, available);
  }

  static Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_workerIdKey);
    await prefs.remove(_workerPhoneKey);
  }
}

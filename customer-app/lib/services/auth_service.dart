import '../config/api_config.dart';
import '../models/user_model.dart';
import 'api_client.dart';
import 'storage_service.dart';

class AuthService {
  static Future<Map<String, dynamic>> requestOtp(String phone) async {
    final res = await ApiClient.post(
      ApiConfig.otpRequest,
      body: {
        'phone': phone,
        'role': 'customer',
      },
      requiresAuth: false,
    );
    return res as Map<String, dynamic>;
  }

  static Future<UserModel> verifyOtp({required String phone, required String code}) async {
    final res = await ApiClient.post(
      ApiConfig.otpVerify,
      body: {
        'phone': phone,
        'code': code,
        'role': 'customer',
      },
      requiresAuth: false,
    );

    final data = res as Map<String, dynamic>;
    final token = data['token'] as String;
    final userData = (data['customer'] ?? data['user'] ?? data) as Map<String, dynamic>;
    final user = UserModel.fromJson(userData);

    await StorageService.saveSession(
      token: token,
      userId: user.id,
      phone: user.phone,
      name: user.fullName,
      address: user.defaultAddress,
    );

    return user;
  }

  static Future<void> logout() async {
    await StorageService.clearSession();
  }
}

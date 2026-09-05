import '../config/api_config.dart';
import 'api_client.dart';
import 'storage_service.dart';

class WorkerAuthService {
  static Future<Map<String, dynamic>> requestOtp(String phone, {String role = 'worker'}) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[\s-]'), '');
    final response = await ApiClient.post(
      ApiConfig.otpRequest,
      body: {
        'phone': cleanPhone,
        'role': role,
      },
      requiresAuth: false,
    );
    return response is Map<String, dynamic> ? response : {};
  }

  static Future<Map<String, dynamic>> verifyOtp({
    required String phone,
    required String code,
    String role = 'worker',
  }) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[\s-]'), '');
    final response = await ApiClient.post(
      ApiConfig.otpVerify,
      body: {
        'phone': cleanPhone,
        'code': code.trim(),
        'role': role,
      },
      requiresAuth: false,
    );

    if (response is Map<String, dynamic>) {
      final token = response['token']?.toString() ?? '';
      final worker = response['worker'] ?? response['user'];
      final workerId = (worker is Map) ? worker['id']?.toString() ?? '' : '';

      if (token.isNotEmpty) {
        await StorageService.saveAuth(
          token: token,
          workerId: workerId,
          phone: cleanPhone,
        );
      }
      return response;
    }

    return {};
  }

  static Future<void> logout() async {
    await StorageService.clearAuth();
  }

  static Future<bool> isLoggedIn() async {
    final token = await StorageService.getToken();
    return token != null && token.isNotEmpty;
  }
}

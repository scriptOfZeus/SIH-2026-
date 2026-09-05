import '../config/api_config.dart';
import '../models/user_model.dart';
import 'api_client.dart';

class CustomerService {
  static Future<UserModel> getProfile() async {
    final res = await ApiClient.get(ApiConfig.customerMe);
    return UserModel.fromJson(res as Map<String, dynamic>);
  }

  static Future<UserModel> registerProfile({
    required String fullName,
    required String defaultAddress,
    double? defaultLat,
    double? defaultLng,
  }) async {
    final res = await ApiClient.patch(
      ApiConfig.customerMe,
      body: {
        'full_name': fullName,
        'default_address': defaultAddress,
        if (defaultLat != null) 'default_lat': defaultLat,
        if (defaultLng != null) 'default_lng': defaultLng,
      },
    );
    return UserModel.fromJson(res as Map<String, dynamic>);
  }

  static Future<UserModel> updateProfile({
    String? fullName,
    String? defaultAddress,
    double? defaultLat,
    double? defaultLng,
  }) async {
    final res = await ApiClient.patch(
      ApiConfig.customerMe,
      body: {
        if (fullName != null) 'full_name': fullName,
        if (defaultAddress != null) 'default_address': defaultAddress,
        if (defaultLat != null) 'default_lat': defaultLat,
        if (defaultLng != null) 'default_lng': defaultLng,
      },
    );
    return UserModel.fromJson(res as Map<String, dynamic>);
  }
}

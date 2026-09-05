import '../config/api_config.dart';
import 'api_client.dart';

class DisputeService {
  static Future<Map<String, dynamic>?> submitDispute({
    required String bookingId,
    required String reason,
    String? documentBase64,
    String? mimeType,
  }) async {
    final body = <String, dynamic>{
      'booking_id': bookingId,
      'reason': reason,
      if (documentBase64 != null) 'document_base64': documentBase64,
      if (mimeType != null) 'mime_type': mimeType,
    };

    final res = await ApiClient.post(ApiConfig.disputes, body: body);
    if (res is Map<String, dynamic>) {
      return res;
    }
    return null;
  }

  static Future<List<dynamic>> getMyDisputes() async {
    try {
      final res = await ApiClient.get('${ApiConfig.disputes}/my-disputes');
      if (res is List) return res;
    } catch (_) {}
    return [];
  }
}

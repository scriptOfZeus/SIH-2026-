import '../config/api_config.dart';
import '../models/payment_model.dart';
import 'api_client.dart';

class PaymentService {
  static Future<PaymentModel> initiatePayment({
    required String bookingId,
    required double amount,
  }) async {
    final res = await ApiClient.post(
      ApiConfig.initiatePayment,
      body: {
        'booking_id': bookingId,
        'amount': amount,
      },
    );
    return PaymentModel.fromJson(res as Map<String, dynamic>);
  }

  static Future<PaymentModel> getPaymentReceipt(String bookingId) async {
    final res = await ApiClient.get('${ApiConfig.baseUrl}/payments/$bookingId');
    return PaymentModel.fromJson(res as Map<String, dynamic>);
  }
}

import '../config/api_config.dart';
import '../models/rating_model.dart';
import 'api_client.dart';

class RatingService {
  static Future<RatingModel> submitRating({
    required String bookingId,
    required int rating,
    String? comment,
  }) async {
    final res = await ApiClient.post(
      ApiConfig.submitRating,
      body: {
        'booking_id': bookingId,
        'rating': rating,
        if (comment != null) 'comment': comment,
      },
    );
    return RatingModel.fromJson(res as Map<String, dynamic>);
  }
}

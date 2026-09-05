class RatingModel {
  final String id;
  final String bookingId;
  final String ratedBy;
  final int rating;
  final String? comment;
  final String createdAt;

  RatingModel({
    required this.id,
    required this.bookingId,
    required this.ratedBy,
    required this.rating,
    this.comment,
    required this.createdAt,
  });

  factory RatingModel.fromJson(Map<String, dynamic> json) {
    return RatingModel(
      id: json['id'] ?? '',
      bookingId: json['booking_id'] ?? '',
      ratedBy: json['rated_by'] ?? 'customer',
      rating: json['rating'] ?? 5,
      comment: json['comment'],
      createdAt: json['created_at'] ?? DateTime.now().toIso8601String(),
    );
  }
}

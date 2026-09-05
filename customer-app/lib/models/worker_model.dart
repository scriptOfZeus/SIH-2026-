class WorkerModel {
  final String id;
  final String fullName;
  final String skillCategory;
  final String? phone;
  final double avgRating;
  final double reliabilityScore;
  final double? distanceKm;
  final double? lat;
  final double? lng;
  final bool isVerified;
  final double hourlyRate;
  final int totalJobs;
  final String? bio;

  WorkerModel({
    required this.id,
    required this.fullName,
    required this.skillCategory,
    this.phone,
    this.avgRating = 5.0,
    this.reliabilityScore = 1.0,
    this.distanceKm,
    this.lat,
    this.lng,
    this.isVerified = true,
    this.hourlyRate = 450.0, // Standard INR base rate
    this.totalJobs = 120,
    this.bio,
  });

  factory WorkerModel.fromJson(Map<String, dynamic> json) {
    return WorkerModel(
      id: json['id'] ?? '',
      fullName: json['full_name'] ?? 'Cooperative Professional',
      skillCategory: json['skill_category'] ?? 'electrician',
      phone: json['phone'],
      avgRating: (json['avg_rating'] as num?)?.toDouble() ?? 4.9,
      reliabilityScore: (json['reliability_score'] as num?)?.toDouble() ?? 0.98,
      distanceKm: (json['distance_km'] as num?)?.toDouble(),
      lat: (json['lat'] ?? json['approx_lat'] as num?)?.toDouble(),
      lng: (json['lng'] ?? json['approx_lng'] as num?)?.toDouble(),
      isVerified: json['verification_status'] == 'approved' ||
          json['verification_status'] == null ||
          json['skill_certificate_verified'] == 1 ||
          json['skill_certificate_verified'] == true,
      hourlyRate: (json['hourly_rate'] as num?)?.toDouble() ?? _getCategoryDefaultRate(json['skill_category']),
      totalJobs: 120,
      bio: json['bio'] as String?,
    );
  }

  static double _getCategoryDefaultRate(String? category) {
    switch (category?.toLowerCase()) {
      case 'electrician':
        return 450.0;
      case 'plumber':
        return 400.0;
      case 'cleaner':
        return 350.0;
      case 'carpenter':
        return 500.0;
      case 'painter':
        return 450.0;
      default:
        return 450.0;
    }
  }
}

class WorkerProfile {
  final String id;
  final String federationId;
  final String fullName;
  final String phone;
  final String skillCategory;
  final String? skillCertificateNumber;
  final bool skillCertificateVerified;
  final String verificationStatus; // 'approved' | 'pending' | 'rejected'
  final double? lat;
  final double? lng;
  final String? ocrStatus;
  final double? ocrConfidenceScore;
  final double hourlyRate;
  final double avgRating;
  final int totalJobs;
  final int experienceYears;
  final String? address;
  final String? pincode;
  final bool isAvailable;
  final String availabilitySchedule;
  final List<String> specialties;
  final String certificationLevel;

  WorkerProfile({
    required this.id,
    this.federationId = 'fed-wb-01',
    required this.fullName,
    required this.phone,
    required this.skillCategory,
    this.skillCertificateNumber,
    this.skillCertificateVerified = false,
    this.verificationStatus = 'approved',
    this.lat,
    this.lng,
    this.ocrStatus,
    this.ocrConfidenceScore,
    this.hourlyRate = 450.0,
    this.avgRating = 4.8,
    this.totalJobs = 120,
    this.experienceYears = 8,
    this.address = 'Park Street, Kolkata, WB 700016',
    this.pincode = '700016',
    this.isAvailable = true,
    this.availabilitySchedule = 'Mon-Sat, 9am - 7pm',
    this.specialties = const ['Wiring', 'Panels', 'Troubleshooting', 'Appliance Repair'],
    this.certificationLevel = 'Gov. Approved Level 3',
  });

  bool get isApproved => verificationStatus.toLowerCase() == 'approved';

  factory WorkerProfile.fromJson(Map<String, dynamic> json) {
    return WorkerProfile(
      id: json['id']?.toString() ?? '',
      federationId: json['federation_id']?.toString() ?? 'fed-wb-01',
      fullName: json['full_name']?.toString() ?? 'Worker Partner',
      phone: json['phone']?.toString() ?? '',
      skillCategory: json['skill_category']?.toString() ?? 'electrician',
      skillCertificateNumber: json['skill_certificate_number']?.toString(),
      skillCertificateVerified: json['skill_certificate_verified'] == 1 || json['skill_certificate_verified'] == true,
      verificationStatus: json['verification_status']?.toString() ?? 'approved',
      lat: (json['lat'] is num) ? (json['lat'] as num).toDouble() : null,
      lng: (json['lng'] is num) ? (json['lng'] as num).toDouble() : null,
      ocrStatus: json['ocr_status']?.toString(),
      ocrConfidenceScore: (json['ocr_confidence_score'] is num) ? (json['ocr_confidence_score'] as num).toDouble() : null,
      hourlyRate: (json['hourly_rate'] is num) ? (json['hourly_rate'] as num).toDouble() : 450.0,
      avgRating: (json['avg_rating'] is num) ? (json['avg_rating'] as num).toDouble() : 4.8,
      totalJobs: (json['total_jobs'] is num) ? (json['total_jobs'] as num).toInt() : 120,
      experienceYears: (json['experience_years'] is num) ? (json['experience_years'] as num).toInt() : 8,
      address: json['address']?.toString() ?? 'Park Street, Kolkata, WB 700016',
      pincode: json['pincode']?.toString() ?? '700016',
      isAvailable: json['is_available'] == 1 || json['is_available'] == true || json['is_available'] == null,
      availabilitySchedule: json['availability_schedule']?.toString() ?? 'Mon-Sat, 9am - 7pm',
      specialties: (json['specialties'] is List)
          ? List<String>.from(json['specialties'].map((x) => x.toString()))
          : ['Wiring', 'Panels', 'Troubleshooting'],
      certificationLevel: json['certification_level']?.toString() ?? 'Gov. Approved Level 3',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'federation_id': federationId,
      'full_name': fullName,
      'phone': phone,
      'skill_category': skillCategory,
      'skill_certificate_number': skillCertificateNumber,
      'skill_certificate_verified': skillCertificateVerified ? 1 : 0,
      'verification_status': verificationStatus,
      'lat': lat,
      'lng': lng,
      'hourly_rate': hourlyRate,
      'avg_rating': avgRating,
      'total_jobs': totalJobs,
      'experience_years': experienceYears,
      'address': address,
      'pincode': pincode,
      'is_available': isAvailable ? 1 : 0,
      'availability_schedule': availabilitySchedule,
      'specialties': specialties,
      'certification_level': certificationLevel,
    };
  }

  WorkerProfile copyWith({
    String? fullName,
    String? phone,
    String? skillCategory,
    String? skillCertificateNumber,
    bool? skillCertificateVerified,
    String? verificationStatus,
    double? lat,
    double? lng,
    double? hourlyRate,
    double? avgRating,
    int? totalJobs,
    int? experienceYears,
    String? address,
    String? pincode,
    bool? isAvailable,
    String? availabilitySchedule,
    List<String>? specialties,
    String? certificationLevel,
  }) {
    return WorkerProfile(
      id: id,
      federationId: federationId,
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      skillCategory: skillCategory ?? this.skillCategory,
      skillCertificateNumber: skillCertificateNumber ?? this.skillCertificateNumber,
      skillCertificateVerified: skillCertificateVerified ?? this.skillCertificateVerified,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      ocrStatus: ocrStatus,
      ocrConfidenceScore: ocrConfidenceScore,
      hourlyRate: hourlyRate ?? this.hourlyRate,
      avgRating: avgRating ?? this.avgRating,
      totalJobs: totalJobs ?? this.totalJobs,
      experienceYears: experienceYears ?? this.experienceYears,
      address: address ?? this.address,
      pincode: pincode ?? this.pincode,
      isAvailable: isAvailable ?? this.isAvailable,
      availabilitySchedule: availabilitySchedule ?? this.availabilitySchedule,
      specialties: specialties ?? this.specialties,
      certificationLevel: certificationLevel ?? this.certificationLevel,
    );
  }
}

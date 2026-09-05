class WorkerBooking {
  final String id;
  final String shortCode;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final double customerRating;
  final String serviceAddress;
  final double? serviceLat;
  final double? serviceLng;
  final String skillCategory;
  final String status; // 'requested' | 'accepted' | 'arriving' | 'in_progress' | 'completed' | 'cancelled'
  final String scheduledTime;
  final bool isEmergency;
  final double emergencyFee;
  final double laborRate;
  final double partsFee;
  final double platformFee;
  final double totalAmount;
  final String problemDescription;
  final double distanceKm;
  final String estimatedDuration;
  final String customerNote;
  final String? serviceNotes;
  final String createdAt;
  final bool completedByWorker;
  final bool completedByCustomer;

  WorkerBooking({
    required this.id,
    required this.shortCode,
    required this.customerId,
    this.customerName = 'Verified Customer',
    this.customerPhone = '+91 98765 43210',
    this.customerRating = 4.8,
    required this.serviceAddress,
    this.serviceLat,
    this.serviceLng,
    required this.skillCategory,
    required this.status,
    required this.scheduledTime,
    this.isEmergency = false,
    this.emergencyFee = 0.0,
    this.laborRate = 850.0,
    this.partsFee = 0.0,
    this.platformFee = 50.0,
    this.totalAmount = 850.0,
    this.problemDescription = 'Service required at location',
    this.distanceKm = 2.4,
    this.estimatedDuration = '1.5 - 2 hrs',
    this.customerNote = '',
    this.serviceNotes,
    required this.createdAt,
    this.completedByWorker = false,
    this.completedByCustomer = false,
  });

  bool get isCompleted => status.toLowerCase() == 'completed' || (completedByWorker && completedByCustomer);
  bool get isActive => status.toLowerCase() == 'accepted' || status.toLowerCase() == 'arriving' || status.toLowerCase() == 'in_progress';
  bool get isPending => status.toLowerCase() == 'requested';

  factory WorkerBooking.fromJson(Map<String, dynamic> json) {
    final isEmerg = json['is_emergency'] == 1 || json['is_emergency'] == true;
    final short = json['short_code']?.toString() ??
        (json['id'] != null && json['id'].toString().length >= 6
            ? 'BK${json['id'].toString().substring(0, 4).toUpperCase()}'
            : 'BK${json['id'] ?? '0000'}');

    final num total = (json['total_amount'] is num)
        ? json['total_amount']
        : (isEmerg ? 900.0 : 850.0);

    return WorkerBooking(
      id: json['id']?.toString() ?? '',
      shortCode: short,
      customerId: json['customer_id']?.toString() ?? 'c-default',
      customerName: json['customer_name']?.toString() ??
          (json['customer'] is Map ? json['customer']['full_name']?.toString() ?? 'Customer' : 'Customer'),
      customerPhone: json['customer_phone']?.toString() ??
          (json['customer'] is Map ? json['customer']['phone']?.toString() ?? '+91 98765 43210' : '+91 98765 43210'),
      customerRating: (json['customer_rating'] is num) ? (json['customer_rating'] as num).toDouble() : 4.9,
      serviceAddress: json['service_address']?.toString() ?? 'Kolkata, West Bengal',
      serviceLat: (json['service_lat'] is num) ? (json['service_lat'] as num).toDouble() : 22.5726,
      serviceLng: (json['service_lng'] is num) ? (json['service_lng'] as num).toDouble() : 88.3639,
      skillCategory: json['skill_category']?.toString() ?? 'electrician',
      status: json['status']?.toString().toLowerCase() ?? 'requested',
      scheduledTime: json['scheduled_time']?.toString() ?? (isEmerg ? 'immediate' : 'Today, 2:30 PM'),
      isEmergency: isEmerg,
      emergencyFee: (json['emergency_fee'] is num) ? (json['emergency_fee'] as num).toDouble() : (isEmerg ? 50.0 : 0.0),
      laborRate: (json['labor_rate'] is num) ? (json['labor_rate'] as num).toDouble() : (isEmerg ? 850.0 : 600.0),
      partsFee: (json['parts_fee'] is num) ? (json['parts_fee'] as num).toDouble() : 0.0,
      platformFee: (json['platform_fee'] is num) ? (json['platform_fee'] as num).toDouble() : 50.0,
      totalAmount: total.toDouble(),
      problemDescription: json['problem_description']?.toString() ??
          (isEmerg ? 'Main circuit breaker keeps tripping, house has no power' : 'Standard repair & maintenance required'),
      distanceKm: (json['distance_km'] is num) ? (json['distance_km'] as num).toDouble() : 2.4,
      estimatedDuration: json['estimated_duration']?.toString() ?? (isEmerg ? 'ASAP' : '1.5 - 2 hrs'),
      customerNote: json['customer_note']?.toString() ?? '',
      serviceNotes: json['service_notes']?.toString(),
      createdAt: json['created_at']?.toString() ?? DateTime.now().toIso8601String(),
      completedByWorker: json['completed_by_worker'] == 1 || json['completed_by_worker'] == true,
      completedByCustomer: json['completed_by_customer'] == 1 || json['completed_by_customer'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'short_code': shortCode,
      'customer_id': customerId,
      'customer_name': customerName,
      'customer_phone': customerPhone,
      'customer_rating': customerRating,
      'service_address': serviceAddress,
      'service_lat': serviceLat,
      'service_lng': serviceLng,
      'skill_category': skillCategory,
      'status': status,
      'scheduled_time': scheduledTime,
      'is_emergency': isEmergency ? 1 : 0,
      'emergency_fee': emergencyFee,
      'labor_rate': laborRate,
      'parts_fee': partsFee,
      'platform_fee': platformFee,
      'total_amount': totalAmount,
      'problem_description': problemDescription,
      'distance_km': distanceKm,
      'estimated_duration': estimatedDuration,
      'customer_note': customerNote,
      'service_notes': serviceNotes,
      'created_at': createdAt,
      'completed_by_worker': completedByWorker ? 1 : 0,
      'completed_by_customer': completedByCustomer ? 1 : 0,
    };
  }

  WorkerBooking copyWith({
    String? status,
    String? scheduledTime,
    double? partsFee,
    double? totalAmount,
    String? serviceNotes,
    bool? completedByWorker,
    bool? completedByCustomer,
  }) {
    return WorkerBooking(
      id: id,
      shortCode: shortCode,
      customerId: customerId,
      customerName: customerName,
      customerPhone: customerPhone,
      customerRating: customerRating,
      serviceAddress: serviceAddress,
      serviceLat: serviceLat,
      serviceLng: serviceLng,
      skillCategory: skillCategory,
      status: status ?? this.status,
      scheduledTime: scheduledTime ?? this.scheduledTime,
      isEmergency: isEmergency,
      emergencyFee: emergencyFee,
      laborRate: laborRate,
      partsFee: partsFee ?? this.partsFee,
      platformFee: platformFee,
      totalAmount: totalAmount ?? this.totalAmount,
      problemDescription: problemDescription,
      distanceKm: distanceKm,
      estimatedDuration: estimatedDuration,
      customerNote: customerNote,
      serviceNotes: serviceNotes ?? this.serviceNotes,
      createdAt: createdAt,
      completedByWorker: completedByWorker ?? this.completedByWorker,
      completedByCustomer: completedByCustomer ?? this.completedByCustomer,
    );
  }
}

class BookingModel {
  final String id;
  final String customerId;
  final String? workerId;
  final String? workerName;
  final String? workerPhone;
  final double? workerRating;
  final String skillCategory;
  final String status; // requested, accepted, completed, cancelled, unassigned
  final String scheduledTime;
  final String serviceAddress;
  final double? serviceLat;
  final double? serviceLng;
  final double? estimatedDistanceKm;
  final bool isEmergency;
  final double? emergencyFee;
  final bool completedByCustomer;
  final bool completedByWorker;
  final String? shortCode;
  final String createdAt;
  final double totalAmount;
  final double partsFee;
  final String? serviceNotes;
  final String? serviceId;
  final double? serviceUnitPrice;
  final int quantity;
  final int effectiveQuantity;
  final double? grossAmount;

  BookingModel({
    required this.id,
    required this.customerId,
    this.workerId,
    this.workerName,
    this.workerPhone,
    this.workerRating,
    required this.skillCategory,
    required this.status,
    required this.scheduledTime,
    required this.serviceAddress,
    this.serviceLat,
    this.serviceLng,
    this.estimatedDistanceKm,
    this.isEmergency = false,
    this.emergencyFee,
    this.completedByCustomer = false,
    this.completedByWorker = false,
    this.shortCode,
    required this.createdAt,
    this.totalAmount = 300.0,
    this.partsFee = 0.0,
    this.serviceNotes,
    this.serviceId,
    this.serviceUnitPrice,
    this.quantity = 1,
    this.effectiveQuantity = 1,
    this.grossAmount,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    final bool emergency = json['is_emergency'] == 1 || json['is_emergency'] == true;
    final double parts = (json['parts_fee'] as num?)?.toDouble() ?? 0.0;
    final double rawAmount = (json['gross_amount'] as num?)?.toDouble() ?? 
                            (json['amount'] as num?)?.toDouble() ?? 
                            (emergency ? 350.0 : 300.0);
    return BookingModel(
      id: json['id'] ?? '',
      customerId: json['customer_id'] ?? '',
      workerId: json['worker_id'],
      workerName: json['worker_name'] ?? (json['worker_id'] != null ? 'Cooperative Partner' : null),
      workerPhone: json['worker_phone'],
      workerRating: (json['worker_rating'] as num?)?.toDouble() ?? 4.9,
      skillCategory: json['skill_category'] ?? 'electrician',
      status: json['status'] ?? 'requested',
      scheduledTime: json['scheduled_time'] ?? '',
      serviceAddress: json['service_address'] ?? 'Service Location',
      serviceLat: (json['service_lat'] as num?)?.toDouble(),
      serviceLng: (json['service_lng'] as num?)?.toDouble(),
      estimatedDistanceKm: (json['estimated_distance_km'] as num?)?.toDouble(),
      isEmergency: emergency,
      emergencyFee: (json['emergency_fee'] as num?)?.toDouble(),
      completedByCustomer: json['completed_by_customer'] == 1 || json['completed_by_customer'] == true,
      completedByWorker: json['completed_by_worker'] == 1 || json['completed_by_worker'] == true,
      shortCode: json['short_code'],
      createdAt: json['created_at'] ?? DateTime.now().toIso8601String(),
      totalAmount: rawAmount + parts,
      partsFee: parts,
      serviceNotes: json['service_notes'],
      serviceId: json['service_id'],
      serviceUnitPrice: (json['service_unit_price'] as num?)?.toDouble(),
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      effectiveQuantity: (json['effective_quantity'] as num?)?.toInt() ?? 1,
      grossAmount: (json['gross_amount'] as num?)?.toDouble() ?? rawAmount,
    );
  }

  bool get isUpcoming => status == 'requested' || status == 'accepted';
  bool get isActive => status == 'accepted';
  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled';
}

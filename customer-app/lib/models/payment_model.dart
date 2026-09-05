class PaymentModel {
  final String id;
  final String bookingId;
  final double amount;
  final double platformCommission;
  final double welfareDeduction;
  final double workerPayout;
  final String status;
  final String? razorpayPaymentId;
  final String createdAt;

  PaymentModel({
    required this.id,
    required this.bookingId,
    required this.amount,
    required this.platformCommission,
    required this.welfareDeduction,
    required this.workerPayout,
    required this.status,
    this.razorpayPaymentId,
    required this.createdAt,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id'] ?? '',
      bookingId: json['booking_id'] ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      platformCommission: (json['platform_commission'] as num?)?.toDouble() ?? 0.0,
      welfareDeduction: (json['welfare_deduction'] as num?)?.toDouble() ?? 0.0,
      workerPayout: (json['worker_payout'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'pending',
      razorpayPaymentId: json['razorpay_payment_id'],
      createdAt: json['created_at'] ?? DateTime.now().toIso8601String(),
    );
  }
}

class WorkerNotification {
  final String id;
  final String title;
  final String message;
  final String time;
  final bool isEmergency;
  final bool isRead;
  final String? bookingId;
  final String type; // 'emergency_dispatch' | 'job_offer' | 'job_completed' | 'payout' | 'system'

  WorkerNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    this.isEmergency = false,
    this.isRead = false,
    this.bookingId,
    this.type = 'job_offer',
  });

  WorkerNotification copyWith({bool? isRead}) {
    return WorkerNotification(
      id: id,
      title: title,
      message: message,
      time: time,
      isEmergency: isEmergency,
      isRead: isRead ?? this.isRead,
      bookingId: bookingId,
      type: type,
    );
  }
}

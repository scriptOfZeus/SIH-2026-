class EarningsJobItem {
  final String id;
  final String title;
  final String area;
  final String time;
  final double amount;
  final String iconType; // 'delivery', 'cleaning', 'plumbing', 'electrician', 'ac'

  EarningsJobItem({
    required this.id,
    required this.title,
    required this.area,
    required this.time,
    required this.amount,
    required this.iconType,
  });

  factory EarningsJobItem.fromJson(Map<String, dynamic> json) {
    return EarningsJobItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Service Booking',
      area: json['area']?.toString() ?? 'Service Location',
      time: json['time']?.toString() ?? 'Completed',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      iconType: json['icon_type']?.toString() ?? 'electrician',
    );
  }
}

class WorkerEarningsSummary {
  final double todayEarnings;
  final double weeklyEarnings;
  final double monthlyEarnings;
  final int todayJobs;
  final double rating;
  final double welfareContribution;
  final double growthPercentage;
  final Map<String, double> weeklyChartData;
  final List<EarningsJobItem> recentJobs;

  WorkerEarningsSummary({
    this.todayEarnings = 0.0,
    this.weeklyEarnings = 0.0,
    this.monthlyEarnings = 0.0,
    this.todayJobs = 0,
    this.rating = 5.0,
    this.welfareContribution = 0.0,
    this.growthPercentage = 12.0,
    this.weeklyChartData = const {
      'Mon': 0.0,
      'Tue': 0.0,
      'Wed': 0.0,
      'Thu': 0.0,
      'Fri': 0.0,
      'Sat': 0.0,
      'Sun': 0.0,
    },
    List<EarningsJobItem>? recentJobs,
  }) : recentJobs = recentJobs ?? [];

  factory WorkerEarningsSummary.fromJson(Map<String, dynamic> json) {
    final rawChart = json['weekly_chart_data'] as Map<String, dynamic>?;
    final chartMap = <String, double>{};
    if (rawChart != null) {
      rawChart.forEach((k, v) {
        chartMap[k] = (v as num?)?.toDouble() ?? 0.0;
      });
    }

    final rawJobs = json['recent_jobs'] as List<dynamic>?;
    final jobsList = rawJobs != null
        ? rawJobs.map((j) => EarningsJobItem.fromJson(j as Map<String, dynamic>)).toList()
        : <EarningsJobItem>[];

    return WorkerEarningsSummary(
      todayEarnings: (json['today_earnings'] as num?)?.toDouble() ?? 0.0,
      weeklyEarnings: (json['weekly_earnings'] as num?)?.toDouble() ?? 0.0,
      monthlyEarnings: (json['monthly_earnings'] as num?)?.toDouble() ?? 0.0,
      todayJobs: (json['today_jobs'] as num?)?.toInt() ?? 0,
      rating: (json['rating'] as num?)?.toDouble() ?? 5.0,
      welfareContribution: (json['welfare_contribution'] as num?)?.toDouble() ?? 0.0,
      growthPercentage: (json['growth_percentage'] as num?)?.toDouble() ?? 12.0,
      weeklyChartData: chartMap.isNotEmpty
          ? chartMap
          : const {
              'Mon': 0.0,
              'Tue': 0.0,
              'Wed': 0.0,
              'Thu': 0.0,
              'Fri': 0.0,
              'Sat': 0.0,
              'Sun': 0.0,
            },
      recentJobs: jobsList,
    );
  }
}

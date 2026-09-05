import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/worker_booking_provider.dart';
import '../../providers/worker_earnings_provider.dart';
import '../../providers/worker_profile_provider.dart';
import '../../widgets/worker_bottom_nav.dart';
import '../earnings/worker_earnings_screen.dart';
import '../jobs/job_history_screen.dart';
import '../notifications/worker_notifications_screen.dart';
import '../profile/worker_profile_screen.dart';
import 'worker_dashboard_screen.dart';

class WorkerMainScreen extends StatefulWidget {
  final int initialTabIndex;

  const WorkerMainScreen({
    super.key,
    this.initialTabIndex = 0,
  });

  @override
  State<WorkerMainScreen> createState() => _WorkerMainScreenState();
}

class _WorkerMainScreenState extends State<WorkerMainScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTabIndex;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<WorkerProfileProvider>(context, listen: false).fetchProfile();
      Provider.of<WorkerBookingProvider>(context, listen: false).fetchBookings();
      Provider.of<WorkerEarningsProvider>(context, listen: false).fetchEarnings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      const WorkerDashboardScreen(),
      const JobHistoryScreen(),
      const WorkerEarningsScreen(),
      const WorkerNotificationsScreen(),
      const WorkerProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: WorkerBottomNav(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() => _currentIndex = index);
        },
        alertCount: 1,
      ),
    );
  }
}

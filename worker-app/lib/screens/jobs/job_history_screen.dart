import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../models/worker_booking_model.dart';
import '../../providers/worker_booking_provider.dart';
import '../../widgets/job_card.dart';
import '../active_job/active_job_screen.dart';
import 'emergency_request_modal.dart';
import 'job_request_details_screen.dart';

class JobHistoryScreen extends StatefulWidget {
  const JobHistoryScreen({super.key});

  @override
  State<JobHistoryScreen> createState() => _JobHistoryScreenState();
}

class _JobHistoryScreenState extends State<JobHistoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _tabs = ['All', 'Pending', 'Active', 'Completed', 'Cancelled', 'Emergency'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<WorkerBooking> _filterBookings(List<WorkerBooking> all, String tab) {
    switch (tab) {
      case 'Pending':
        return all.where((b) => b.isPending).toList();
      case 'Active':
        return all.where((b) => b.isActive).toList();
      case 'Completed':
        return all.where((b) => b.isCompleted).toList();
      case 'Cancelled':
        return all.where((b) => b.status == 'cancelled').toList();
      case 'Emergency':
        return all.where((b) => b.isEmergency).toList();
      case 'All':
      default:
        return all;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<WorkerBookingProvider>(context);
    final l10n = WorkerLocalizations.of(context);

    String getTabName(String tab) {
      switch (tab) {
        case 'All':
          return l10n.tr('filter_all');
        case 'Pending':
          return l10n.tr('filter_pending');
        case 'Active':
          return l10n.tr('filter_active');
        case 'Completed':
          return l10n.tr('filter_completed');
        case 'Cancelled':
          return l10n.tr('filter_cancelled');
        case 'Emergency':
          return l10n.tr('filter_emergency');
        default:
          return tab;
      }
    }

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        title: Text(l10n.tr('my_jobs')),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: AppTheme.primaryBlue,
          unselectedLabelColor: AppTheme.textSecondary,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          indicatorColor: AppTheme.primaryBlue,
          indicatorWeight: 3,
          tabAlignment: TabAlignment.start,
          tabs: _tabs.map((t) => Tab(text: getTabName(t))).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: _tabs.map((tab) {
          final filtered = _filterBookings(bookingProvider.bookings, tab);

          if (filtered.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.assignment_outlined, size: 54, color: Colors.grey.shade400),
                  const SizedBox(height: 14),
                  Text(
                    l10n.tr('no_pending_requests'),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    l10n.tr('no_pending_requests_msg'),
                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => bookingProvider.fetchBookings(),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              itemCount: filtered.length,
              itemBuilder: (context, index) {
                final booking = filtered[index];
                return JobCard(
                  booking: booking,
                  onTap: () {
                    if (booking.isActive) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ActiveJobScreen(booking: booking),
                        ),
                      );
                    } else if (booking.isPending) {
                      if (booking.isEmergency) {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => EmergencyRequestModal(booking: booking),
                          ),
                        );
                      } else {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => JobRequestDetailsScreen(booking: booking),
                          ),
                        );
                      }
                    } else {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => JobRequestDetailsScreen(booking: booking),
                        ),
                      );
                    }
                  },
                  onAccept: () async {
                    if (booking.isEmergency) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => EmergencyRequestModal(booking: booking),
                        ),
                      );
                    } else {
                      final ok = await bookingProvider.acceptBooking(booking.id);
                      if (ok && context.mounted) {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ActiveJobScreen(booking: booking),
                          ),
                        );
                      }
                    }
                  },
                  onDecline: () {
                    bookingProvider.rejectBooking(booking.id);
                  },
                );
              },
            ),
          );
        }).toList(),
      ),
    );
  }
}

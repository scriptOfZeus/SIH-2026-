import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/currency.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../providers/worker_booking_provider.dart';
import '../../providers/worker_earnings_provider.dart';
import '../../providers/worker_profile_provider.dart';
import '../../widgets/job_card.dart';
import '../../widgets/stat_card.dart';
import '../active_job/active_job_screen.dart';
import '../jobs/emergency_request_modal.dart';
import '../jobs/job_request_details_screen.dart';
import '../notifications/worker_notifications_screen.dart';

class WorkerDashboardScreen extends StatelessWidget {
  const WorkerDashboardScreen({super.key});

  String _getGreeting(WorkerLocalizations l10n) {
    final hour = DateTime.now().hour;
    if (hour < 12) return l10n.tr('good_morning');
    if (hour < 17) return l10n.tr('good_afternoon');
    return l10n.tr('good_evening');
  }

  @override
  Widget build(BuildContext context) {
    final profileProvider = Provider.of<WorkerProfileProvider>(context);
    final bookingProvider = Provider.of<WorkerBookingProvider>(context);
    final earningsProvider = Provider.of<WorkerEarningsProvider>(context);
    final l10n = WorkerLocalizations.of(context);

    final isAvail = profileProvider.isAvailable;
    final workerName = profileProvider.workerName.split(' ').first;
    final incomingRequest = bookingProvider.incomingRequest;
    final activeJob = bookingProvider.activeBooking;
    final tradeName = l10n.tr(profileProvider.tradeSkill.toLowerCase());

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await Future.wait([
              profileProvider.fetchProfile(),
              bookingProvider.fetchBookings(),
              earningsProvider.fetchEarnings(),
            ]);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header Row
                Row(
                  children: [
                    // Worker Avatar with green checkmark
                    Stack(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                            border: Border.all(color: AppTheme.primaryBlue, width: 1.5),
                          ),
                          child: const Center(
                            child: Icon(Icons.person, color: AppTheme.primaryBlue, size: 28),
                          ),
                        ),
                        if (profileProvider.isVerified)
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              width: 16,
                              height: 16,
                              decoration: const BoxDecoration(
                                color: AppTheme.verifiedGreen,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.check, size: 11, color: Colors.white),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),

                    // Greeting & Trade Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${_getGreeting(l10n)}, $workerName',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.textDark,
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$tradeName • ${l10n.tr('verified_partner')}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Notification Bell with red dot
                    InkWell(
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const WorkerNotificationsScreen(),
                          ),
                        );
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppTheme.borderLight),
                            ),
                            child: const Icon(Icons.notifications_none, color: AppTheme.primaryBlue, size: 22),
                          ),
                          Positioned(
                            top: 2,
                            right: 2,
                            child: Container(
                              width: 9,
                              height: 9,
                              decoration: const BoxDecoration(
                                color: AppTheme.dangerRed,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Availability Card Toggle
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                    border: Border.all(color: AppTheme.borderLight),
                    boxShadow: AppTheme.cardShadow,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: isAvail ? AppTheme.accentBlue : Colors.grey,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                isAvail ? l10n.tr('you_are_available') : l10n.tr('you_are_offline'),
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.textDark,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                          Switch(
                            value: isAvail,
                            activeThumbColor: Colors.white,
                            activeTrackColor: AppTheme.primaryBlue,
                            inactiveThumbColor: Colors.white,
                            inactiveTrackColor: Colors.grey.shade300,
                            onChanged: (val) {
                              profileProvider.toggleAvailability(val);
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isAvail
                            ? l10n.tr('available_subtitle')
                            : l10n.tr('offline_subtitle'),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Today's Overview Section Header
                Text(
                  l10n.tr('todays_overview'),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textSecondary,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 12),

                // 3 Horizontal Stat Cards
                Row(
                  children: [
                    StatCard(
                      icon: Icons.account_balance_wallet,
                      label: l10n.tr('earnings_label'),
                      value: CurrencyFormatter.format(earningsProvider.summary.todayEarnings),
                      isPrimary: true,
                    ),
                    const SizedBox(width: 10),
                    StatCard(
                      icon: Icons.work_outline,
                      label: l10n.tr('todays_jobs'),
                      value: '${earningsProvider.summary.todayJobs}',
                    ),
                    const SizedBox(width: 10),
                    StatCard(
                      icon: Icons.star,
                      label: l10n.tr('rating_label'),
                      value: '${earningsProvider.summary.rating}',
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Active Job Banner (if worker has active in-progress job)
                if (activeJob != null) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.navigation, color: AppTheme.primaryBlue, size: 16),
                          const SizedBox(width: 6),
                          Text(
                            l10n.tr('current_active_job'),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primaryBlue,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE3F2FD),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          l10n.tr('${activeJob.status.toLowerCase()}_status_badge'),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primaryBlue,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  JobCard(
                    booking: activeJob,
                    showActions: false,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ActiveJobScreen(booking: activeJob),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 20),
                ],

                // New Requests Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.bolt, color: AppTheme.dangerRed, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          l10n.tr('new_requests'),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.dangerRed,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    if (incomingRequest != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFEBEE),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          l10n.tr('new_badge', params: {'count': '1'}),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.dangerRed,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),

                // Incoming Request Card or Empty State
                if (incomingRequest != null)
                  JobCard(
                    booking: incomingRequest,
                    onAccept: () async {
                      if (incomingRequest.isEmergency) {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => EmergencyRequestModal(booking: incomingRequest),
                          ),
                        );
                      } else {
                        final ok = await bookingProvider.acceptBooking(incomingRequest.id);
                        if (ok && context.mounted) {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => ActiveJobScreen(booking: incomingRequest),
                            ),
                          );
                        }
                      }
                    },
                    onDecline: () {
                      bookingProvider.rejectBooking(incomingRequest.id);
                    },
                    onTap: () {
                      if (incomingRequest.isEmergency) {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => EmergencyRequestModal(booking: incomingRequest),
                          ),
                        );
                      } else {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => JobRequestDetailsScreen(booking: incomingRequest),
                          ),
                        );
                      }
                    },
                  )
                else
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                      border: Border.all(color: AppTheme.borderLight),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.inbox_outlined, size: 44, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        Text(
                          l10n.tr('no_pending_requests'),
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          l10n.tr('no_pending_requests_msg'),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

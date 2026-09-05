import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../models/worker_booking_model.dart';
import '../../providers/worker_booking_provider.dart';
import '../../widgets/app_button.dart';
import 'complete_service_screen.dart';
import 'customer_communication_screen.dart';

class ActiveJobScreen extends StatefulWidget {
  final WorkerBooking booking;

  const ActiveJobScreen({
    super.key,
    required this.booking,
  });

  @override
  State<ActiveJobScreen> createState() => _ActiveJobScreenState();
}

class _ActiveJobScreenState extends State<ActiveJobScreen> {
  late String _currentStatus; // 'accepted', 'arriving', 'arrived', 'in_progress', 'completed'

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.booking.status == 'requested' ? 'accepted' : widget.booking.status;
    if (_currentStatus == 'accepted') {
      _currentStatus = 'arriving'; // Default initial active state "On the Way"
    }
  }

  Future<void> _handleCallCustomer() async {
    final phone = widget.booking.customerPhone;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Calling customer at $phone')),
        );
      }
    }
  }

  Future<void> _handleStartNavigation() async {
    final lat = widget.booking.serviceLat ?? 22.5726;
    final lng = widget.booking.serviceLng ?? 88.3639;
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lng');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Navigating to ${widget.booking.serviceAddress}')),
        );
      }
    }
  }

  void _advanceState() {
    final provider = Provider.of<WorkerBookingProvider>(context, listen: false);

    if (_currentStatus == 'accepted' || _currentStatus == 'arriving') {
      setState(() => _currentStatus = 'arrived');
      provider.advanceActiveJobStatus('arrived');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Status updated: Arrived at customer location')),
      );
    } else if (_currentStatus == 'arrived') {
      setState(() => _currentStatus = 'in_progress');
      provider.advanceActiveJobStatus('in_progress');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Status updated: Service in progress')),
      );
    } else if (_currentStatus == 'in_progress') {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => CompleteServiceScreen(booking: widget.booking),
        ),
      );
    }
  }

  String _getPrimaryButtonLabel(WorkerLocalizations l10n) {
    switch (_currentStatus) {
      case 'accepted':
        return l10n.tr('btn_start_travel');
      case 'arriving':
        return l10n.tr('btn_ive_arrived');
      case 'arrived':
        return l10n.tr('btn_start_service');
      case 'in_progress':
        return l10n.tr('btn_complete_service');
      default:
        return l10n.tr('btn_job_completed');
    }
  }

  int _getStepperIndex() {
    switch (_currentStatus) {
      case 'accepted':
        return 0;
      case 'arriving':
        return 1;
      case 'arrived':
        return 2;
      case 'in_progress':
        return 3;
      case 'completed':
        return 4;
      default:
        return 1;
    }
  }

  String _getStatusPillLabel(WorkerLocalizations l10n) {
    switch (_currentStatus) {
      case 'accepted':
        return l10n.tr('accepted_status_badge');
      case 'arriving':
        return l10n.tr('status_on_the_way');
      case 'arrived':
        return l10n.tr('status_arrived');
      case 'in_progress':
        return l10n.tr('status_in_progress');
      case 'completed':
        return l10n.tr('completed_status_badge');
      default:
        return l10n.tr('active_status_badge');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = WorkerLocalizations.of(context);
    final isEmerg = widget.booking.isEmergency;
    final stepIndex = _getStepperIndex();

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        title: Text(l10n.tr('active_job')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stepper & Status Chip Card
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                border: Border.all(color: AppTheme.borderLight),
                boxShadow: AppTheme.cardShadow,
              ),
              child: Column(
                children: [
                  // 4-Step Progress Line
                  Row(
                    children: List.generate(4, (index) {
                      final isPast = index < stepIndex;
                      final isCurrent = index == stepIndex;

                      return Expanded(
                        child: Row(
                          children: [
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isPast
                                    ? AppTheme.primaryBlue
                                    : (isCurrent ? Colors.white : const Color(0xFFE2E8F0)),
                                border: Border.all(
                                  color: isPast || isCurrent ? AppTheme.primaryBlue : Colors.transparent,
                                  width: isCurrent ? 5 : 1,
                                ),
                              ),
                              child: isPast
                                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                                  : null,
                            ),
                            if (index < 3)
                              Expanded(
                                child: Container(
                                  height: 3,
                                  color: isPast ? AppTheme.primaryBlue : const Color(0xFFE2E8F0),
                                ),
                              ),
                          ],
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 14),

                  // Current Status Pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD6E8FA),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _getStatusPillLabel(l10n),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primaryBlue,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Emergency Notice if applicable
            if (isEmerg) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.emergencyLightBg,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  border: Border.all(color: AppTheme.emergencyBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.bolt, color: AppTheme.emergencyOrange, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      l10n.tr('emergency_dispatch_active'),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.emergencyOrange,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Customer Contact Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                border: Border.all(color: AppTheme.borderLight),
                boxShadow: AppTheme.cardShadow,
              ),
              child: Row(
                children: [
                  Stack(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                        ),
                        child: const Center(
                          child: Icon(Icons.person, color: AppTheme.primaryBlue, size: 28),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: const BoxDecoration(
                            color: AppTheme.verifiedGreen,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 12),

                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.booking.customerName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Text(
                              '${l10n.tr('customer_label')} • ',
                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                            ),
                            Text(
                              '${widget.booking.customerRating}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textDark,
                              ),
                            ),
                            const SizedBox(width: 2),
                            const Icon(Icons.star, size: 13, color: AppTheme.ratingYellow),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Message button
                  IconButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CustomerCommunicationScreen(booking: widget.booking),
                        ),
                      );
                    },
                    icon: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.chat_bubble_outline, size: 18, color: AppTheme.textSecondary),
                    ),
                  ),

                  // Call button (Blue Circular)
                  IconButton(
                    onPressed: _handleCallCustomer,
                    icon: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: AppTheme.primaryBlue,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.phone, size: 18, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Location & Job Details Card
            Container(
              padding: const EdgeInsets.all(16),
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE3F2FD),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.location_on, color: AppTheme.primaryBlue, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.booking.serviceAddress,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textDark,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '🚗 ${l10n.tr('km_away', params: {'distance': widget.booking.distanceKm.toString()})} • ~${(widget.booking.distanceKm * 4).round()} mins',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.primaryBlue,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1, color: AppTheme.dividerColor),
                  const SizedBox(height: 14),

                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.assignment_outlined, color: AppTheme.textSecondary, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.tr('job_details').toUpperCase(),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textSecondary,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              widget.booking.problemDescription,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppTheme.textDark,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Start Navigation Button (Outlined)
            AppButton(
              text: l10n.tr('start_navigation'),
              type: ButtonType.outlined,
              icon: Icons.navigation_outlined,
              onPressed: _handleStartNavigation,
            ),
            const SizedBox(height: 12),

            // Primary State Advance Button ("I've Arrived" / "Start Service" / "Complete Service")
            AppButton(
              text: _getPrimaryButtonLabel(l10n),
              type: ButtonType.primary,
              onPressed: _advanceState,
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

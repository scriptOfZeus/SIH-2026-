import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../models/worker_booking_model.dart';
import '../../widgets/app_button.dart';

class CustomerCommunicationScreen extends StatelessWidget {
  final WorkerBooking booking;

  const CustomerCommunicationScreen({
    super.key,
    required this.booking,
  });

  Future<void> _handleCall(BuildContext context) async {
    final phone = booking.customerPhone;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Dialing customer at $phone')),
        );
      }
    }
  }

  Future<void> _handleStartNavigation(BuildContext context) async {
    final lat = booking.serviceLat ?? 22.5726;
    final lng = booking.serviceLng ?? 88.3639;
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lng');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Navigating to ${booking.serviceAddress}')),
        );
      }
    }
  }

  void _showMessagingUnavailableModal(BuildContext context) {
    final l10n = WorkerLocalizations.of(context);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.chat_bubble_outline, color: AppTheme.primaryBlue),
            const SizedBox(width: 8),
            Text(l10n.tr('in_app_chat')),
          ],
        ),
        content: Text(
          l10n.tr('in_app_chat_desc'),
          style: const TextStyle(fontSize: 14, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(l10n.tr('close')),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(ctx).pop();
              _handleCall(context);
            },
            icon: const Icon(Icons.phone, size: 16),
            label: Text(l10n.tr('call_customer')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = WorkerLocalizations.of(context);
    final note = booking.customerNote.isNotEmpty
        ? booking.customerNote
        : "Main gate is on the left side of the driveway. Please ring the doorbell upon arrival.";

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        title: Text(l10n.tr('customer_details')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          children: [
            // Customer Header Hero Card
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                border: Border.all(color: AppTheme.borderLight),
                boxShadow: AppTheme.cardShadow,
              ),
              child: Column(
                children: [
                  // Blue Header background
                  Container(
                    height: 60,
                    decoration: const BoxDecoration(
                      color: Color(0xFFD6E8FA),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusLarge)),
                    ),
                  ),
                  Transform.translate(
                    offset: const Offset(0, -35),
                    child: Column(
                      children: [
                        Stack(
                          children: [
                            Container(
                              width: 76,
                              height: 76,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white,
                                border: Border.all(color: Colors.white, width: 3),
                                boxShadow: AppTheme.cardShadow,
                              ),
                              child: Center(
                                child: Icon(Icons.person, size: 48, color: AppTheme.primaryBlue.withValues(alpha: 0.8)),
                              ),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 2,
                              child: Container(
                                width: 22,
                                height: 22,
                                decoration: const BoxDecoration(
                                  color: AppTheme.accentBlue,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.check, size: 14, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          booking.customerName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textDark,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE2E8F0),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            l10n.tr('verified_customer').toUpperCase(),
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.textSecondary,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Call & Message Row
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _handleCall(context),
                    icon: const Icon(Icons.phone_outlined, size: 18, color: AppTheme.primaryBlue),
                    label: Text(
                      l10n.tr('call_customer').toUpperCase(),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppTheme.primaryBlue),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: AppTheme.borderLight, width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showMessagingUnavailableModal(context),
                    icon: const Icon(Icons.chat_bubble_outline, size: 18, color: AppTheme.primaryBlue),
                    label: Text(
                      l10n.tr('in_app_chat').toUpperCase(),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppTheme.primaryBlue),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: AppTheme.borderLight, width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Start Navigation Primary Button
            AppButton(
              text: l10n.tr('start_navigation').toUpperCase(),
              type: ButtonType.primary,
              icon: Icons.navigation_outlined,
              onPressed: () => _handleStartNavigation(context),
            ),
            const SizedBox(height: 20),

            // Job Specifics Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                border: Border.all(color: AppTheme.borderLight),
                boxShadow: AppTheme.cardShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.tr('job_details'),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textDark,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Service Requested
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.cleaning_services_outlined, size: 20, color: AppTheme.textSecondary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'SERVICE REQUESTED',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${booking.skillCategory.toUpperCase()} SERVICE',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textDark),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Scheduled Time
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.access_time, size: 20, color: AppTheme.textSecondary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'SCHEDULED TIME',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              booking.isEmergency ? 'Immediate (ASAP)' : booking.scheduledTime,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: booking.isEmergency ? AppTheme.emergencyOrange : AppTheme.textDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Customer Note Callout
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F4FA),
                      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                      border: const Border(
                        left: BorderSide(color: AppTheme.primaryBlue, width: 3),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.info_outline, size: 16, color: AppTheme.primaryBlue),
                            const SizedBox(width: 6),
                            Text(
                              l10n.tr('customer_note'),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primaryBlue,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '"$note"',
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
            ),
            const SizedBox(height: 16),

            // Location Overview
            Container(
              padding: const EdgeInsets.all(18),
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
                      const Text(
                        'Location Overview',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textDark,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE3F2FD),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.location_on, size: 18, color: AppTheme.primaryBlue),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    booking.serviceAddress,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    height: 120,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    ),
                    child: const Center(
                      child: Icon(Icons.map, size: 40, color: Colors.black26),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

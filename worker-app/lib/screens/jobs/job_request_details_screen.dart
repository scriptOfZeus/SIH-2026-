import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/currency.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../models/worker_booking_model.dart';
import '../../providers/worker_booking_provider.dart';
import '../../services/worker_alert_tts_service.dart';
import '../../widgets/app_button.dart';
import '../active_job/active_job_screen.dart';

class JobRequestDetailsScreen extends StatefulWidget {
  final WorkerBooking booking;

  const JobRequestDetailsScreen({
    super.key,
    required this.booking,
  });

  @override
  State<JobRequestDetailsScreen> createState() => _JobRequestDetailsScreenState();
}

class _JobRequestDetailsScreenState extends State<JobRequestDetailsScreen> {
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final l10n = WorkerLocalizations.of(context);
      WorkerAlertTtsService.speakAlert(
        alertId: 'new_job_${widget.booking.id}',
        localizedText: l10n.alertNewJob(
          trade: widget.booking.skillCategory,
          address: widget.booking.serviceAddress,
          amount: widget.booking.totalAmount,
        ),
      );
    });
  }

  Future<void> _handleAccept() async {
    setState(() => _isLoading = true);
    final provider = Provider.of<WorkerBookingProvider>(context, listen: false);
    final success = await provider.acceptBooking(widget.booking.id);

    if (mounted) {
      setState(() => _isLoading = false);
      if (success) {
        final l10n = WorkerLocalizations.of(context);
        WorkerAlertTtsService.speakAlert(
          alertId: 'job_accepted_${widget.booking.id}',
          localizedText: l10n.tr('alert_job_accepted'),
        );

        final accepted = widget.booking.copyWith(status: 'accepted');
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => ActiveJobScreen(booking: accepted),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.errorMessage ?? 'Failed to accept job request'),
            backgroundColor: AppTheme.dangerRed,
          ),
        );
      }
    }
  }

  Future<void> _handleDecline() async {
    final provider = Provider.of<WorkerBookingProvider>(context, listen: false);
    await provider.rejectBooking(widget.booking.id);
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = WorkerLocalizations.of(context);
    final isEmerg = widget.booking.isEmergency;

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        title: Text(l10n.tr('job_request')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Emergency Banner if applicable
            if (isEmerg) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.dangerLightBg,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  border: Border.all(color: AppTheme.dangerRed.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: AppTheme.dangerRed, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      l10n.tr('emergency_service_requested'),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.dangerRed,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Customer Profile Card
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
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                    ),
                    child: const Center(
                      child: Icon(Icons.person, color: AppTheme.primaryBlue, size: 30),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              widget.booking.customerName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textDark,
                              ),
                            ),
                            const Spacer(),
                            const Icon(Icons.star, color: AppTheme.ratingYellow, size: 16),
                            const SizedBox(width: 2),
                            Text(
                              '${widget.booking.customerRating}',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.verifiedLightBg,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.check_circle, size: 11, color: AppTheme.verifiedGreen),
                                  const SizedBox(width: 3),
                                  Text(
                                    l10n.tr('verified_customer'),
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: AppTheme.verifiedGreen,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Member since 2021 • 15+ bookings',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Service & Problem Description Card
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
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryBlue,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.electrical_services, size: 18, color: Colors.white),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        '${widget.booking.skillCategory.toUpperCase()} REPAIR',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textDark,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1, color: AppTheme.dividerColor),
                  const SizedBox(height: 14),
                  Text(
                    l10n.tr('problem_description'),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textSecondary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '"${widget.booking.problemDescription}"',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.textDark,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Schedule Card
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
                    children: [
                      const Icon(Icons.calendar_today_outlined, size: 18, color: AppTheme.primaryBlue),
                      const SizedBox(width: 8),
                      Text(
                        l10n.tr('schedule'),
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textDark,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE3F2FD),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: [
                            const Text(
                              'OCT',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primaryBlue,
                              ),
                            ),
                            Text(
                              isEmerg ? 'NOW' : '24',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primaryDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isEmerg ? 'Immediate (ASAP)' : widget.booking.scheduledTime,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: isEmerg ? AppTheme.emergencyOrange : AppTheme.textDark,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Est. duration: ${widget.booking.estimatedDuration}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Estimated Earnings Card (Blue Filled Header)
            Container(
              decoration: BoxDecoration(
                color: AppTheme.primaryBlue,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                boxShadow: AppTheme.primaryButtonShadow,
              ),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(18),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.tr('estimated_earnings'),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: Colors.white70,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              l10n.tr('guaranteed_payout'),
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          CurrencyFormatter.format(widget.booking.totalAmount),
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.vertical(bottom: Radius.circular(AppTheme.radiusLarge)),
                    ),
                    child: Column(
                      children: [
                        _buildPriceRow(l10n.tr('labor_rate'), widget.booking.laborRate),
                        if (widget.booking.isEmergency) ...[
                          const SizedBox(height: 8),
                          _buildPriceRow(l10n.tr('emergency_fee'), widget.booking.emergencyFee, isHighlight: true),
                        ],
                        const SizedBox(height: 8),
                        _buildPriceRow(l10n.tr('coop_tech_fee'), -widget.booking.platformFee, isDeduction: true),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Location Overview & Simulated Map Card
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
                      const Icon(Icons.location_on_outlined, color: AppTheme.primaryBlue, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.booking.serviceAddress,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textDark,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '${widget.booking.distanceKm} km away',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Map Container with Navigate overlay button
                  Container(
                    height: 130,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    ),
                    child: Stack(
                      children: [
                        const Center(
                          child: Icon(Icons.map_outlined, size: 48, color: Colors.black26),
                        ),
                        Positioned(
                          bottom: 12,
                          right: 12,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Opening Navigation to customer location...')),
                              );
                            },
                            icon: const Icon(Icons.navigation, size: 14, color: AppTheme.primaryBlue),
                            label: const Text(
                              'Navigate',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.primaryBlue,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              elevation: 2,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Bottom Actions: Decline (Outlined) & Accept Job (Primary Filled)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _handleDecline,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppTheme.borderLight, width: 1.5),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(
                      l10n.tr('decline'),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: AppButton(
                    text: l10n.tr('accept_job_btn'),
                    type: ButtonType.primary,
                    isLoading: _isLoading,
                    onPressed: _handleAccept,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceRow(String label, num amount, {bool isDeduction = false, bool isHighlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isHighlight ? FontWeight.w700 : FontWeight.w500,
            color: isHighlight ? AppTheme.emergencyOrange : AppTheme.textSecondary,
          ),
        ),
        Text(
          '${isDeduction ? '-' : ''}${CurrencyFormatter.format(amount.abs())}',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: isDeduction
                ? AppTheme.dangerRed
                : (isHighlight ? AppTheme.emergencyOrange : AppTheme.textDark),
          ),
        ),
      ],
    );
  }
}

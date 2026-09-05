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

class EmergencyRequestModal extends StatefulWidget {
  final WorkerBooking booking;

  const EmergencyRequestModal({
    super.key,
    required this.booking,
  });

  @override
  State<EmergencyRequestModal> createState() => _EmergencyRequestModalState();
}

class _EmergencyRequestModalState extends State<EmergencyRequestModal> {
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final l10n = WorkerLocalizations.of(context);
      WorkerAlertTtsService.speakAlert(
        alertId: 'emergency_dispatch_${widget.booking.id}',
        localizedText: l10n.alertEmergencyDispatch(widget.booking.serviceAddress),
      );
    });
  }

  Future<void> _handleAccept() async {
    setState(() => _isProcessing = true);
    final provider = Provider.of<WorkerBookingProvider>(context, listen: false);
    final success = await provider.acceptBooking(widget.booking.id);

    if (mounted) {
      setState(() => _isProcessing = false);
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
            content: Text(provider.errorMessage ?? 'Failed to accept emergency request'),
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
    final bookingProvider = Provider.of<WorkerBookingProvider>(context);
    final l10n = WorkerLocalizations.of(context);
    final countdown = bookingProvider.emergencyCountdownSeconds;

    return Scaffold(
      backgroundColor: Colors.black.withValues(alpha: 0.65),
      body: Stack(
        children: [
          // Background Simulated Map View
          Positioned.fill(
            child: Container(
              color: const Color(0xFFE5E9EC),
              child: CustomPaint(
                painter: _MapGridPainter(),
              ),
            ),
          ),

          // Top Header Bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                color: Colors.white.withValues(alpha: 0.92),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: AppTheme.primaryDark),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                    Text(
                      l10n.tr('app_title'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primaryDark,
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppTheme.verifiedGreen,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          l10n.tr('active'),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primaryDark,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                          ),
                          child: const Center(
                            child: Icon(Icons.person, size: 18, color: AppTheme.primaryBlue),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Central Emergency Card Modal
          Align(
            alignment: Alignment.center,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 420),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppTheme.radiusXLarge),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x33000000),
                      blurRadius: 24,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppTheme.radiusXLarge),
                  child: Stack(
                    children: [
                      // Left Red Urgency Accent Stripe
                      Positioned(
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        child: Container(color: AppTheme.emergencyOrange),
                      ),

                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header Row: Emergency Badge + Est. Earnings
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: AppTheme.dangerRed,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.warning_amber_rounded, size: 14, color: Colors.white),
                                      const SizedBox(width: 4),
                                      Text(
                                        l10n.tr('emergency_request_header'),
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          color: Colors.white,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      l10n.tr('est_earnings'),
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: AppTheme.textSecondary,
                                      ),
                                    ),
                                    Text(
                                      CurrencyFormatter.format(widget.booking.totalAmount),
                                      style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.primaryDark,
                                        letterSpacing: -0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Customer Name
                            Text(
                              widget.booking.customerName,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textDark,
                              ),
                            ),
                            const SizedBox(height: 14),
                            const Divider(height: 1, color: AppTheme.dividerColor),
                            const SizedBox(height: 14),

                            // Issue Description
                            Text(
                              l10n.tr('issue_header'),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textSecondary,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "'${widget.booking.problemDescription}'",
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textDark,
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Location & Distance Row
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.location_on_outlined, color: AppTheme.textSecondary, size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        l10n.tr('service_location_label'),
                                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                      ),
                                      Text(
                                        widget.booking.serviceAddress,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: AppTheme.textDark,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Icon(Icons.alt_route, size: 16, color: AppTheme.textSecondary),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${widget.booking.distanceKm} km away',
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.textDark,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    const Row(
                                      children: [
                                        Icon(Icons.access_time, size: 16, color: AppTheme.emergencyOrange),
                                        SizedBox(width: 4),
                                        Text(
                                          'ASAP',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w800,
                                            color: AppTheme.emergencyOrange,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),

                            // Countdown Dispatch Indicator
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppTheme.emergencyLightBg,
                                borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                                border: Border.all(color: AppTheme.emergencyBorder),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.timer_outlined, size: 18, color: AppTheme.emergencyOrange),
                                  const SizedBox(width: 8),
                                  Flexible(
                                    child: Text(
                                      'Accept window: ${countdown}s remaining',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.emergencyOrange,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),

                            // Accept Emergency Job Button
                            AppButton(
                              text: l10n.tr('accept_job_btn'),
                              type: ButtonType.primary,
                              isLoading: _isProcessing,
                              onPressed: countdown > 0 ? _handleAccept : null,
                            ),
                            const SizedBox(height: 10),

                            // Decline Button
                            Center(
                              child: TextButton(
                                onPressed: _handleDecline,
                                child: Text(
                                  l10n.tr('decline'),
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.textSecondary,
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
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFD6DFE6)
      ..strokeWidth = 1.0;

    const step = 40.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

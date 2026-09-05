import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/currency.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../services/alert_tts_service.dart';
import '../../widgets/app_button.dart';
import '../home/main_navigation_screen.dart';
import '../payment/payment_invoice_screen.dart';

class BookingStatusScreen extends StatefulWidget {
  final String bookingId;

  const BookingStatusScreen({super.key, required this.bookingId});

  @override
  State<BookingStatusScreen> createState() => _BookingStatusScreenState();
}

class _BookingStatusScreenState extends State<BookingStatusScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<BookingProvider>(context, listen: false).fetchBookingDetail(widget.bookingId);
    });
  }

  Future<void> _handleCompleteService() async {
    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    final success = await bookingProvider.completeBooking(widget.bookingId);
    if (success && mounted) {
      final booking = bookingProvider.activeBooking;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => PaymentInvoiceScreen(
            booking: booking ??
                BookingModel(
                  id: widget.bookingId,
                  customerId: '',
                  skillCategory: 'electrician',
                  status: 'completed',
                  scheduledTime: 'Today',
                  serviceAddress: 'Service Address',
                  createdAt: DateTime.now().toIso8601String(),
                ),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final booking = bookingProvider.activeBooking;
    final l10n = AppLocalizations.of(context);

    if (booking != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final code = booking.id.length > 6 ? booking.id.substring(0, 6) : booking.id;
        final worker = booking.workerName ?? 'Professional';

        if (booking.isEmergency && (booking.status == 'accepted' || booking.status == 'assigned')) {
          AlertTtsService.speakAlert(
            alertId: 'emergency_accepted_${booking.id}',
            localizedText: l10n.translate('alert_emergency_accepted', params: {'worker': worker}),
            languageCode: l10n.locale.languageCode,
          );
        } else if (booking.status == 'arriving') {
          AlertTtsService.speakAlert(
            alertId: 'worker_arriving_${booking.id}',
            localizedText: l10n.translate('alert_worker_arriving', params: {'worker': worker, 'time': '5'}),
            languageCode: l10n.locale.languageCode,
          );
        } else if (booking.status == 'accepted' || booking.status == 'assigned') {
          AlertTtsService.speakAlert(
            alertId: 'booking_accepted_${booking.id}',
            localizedText: l10n.translate('alert_booking_accepted', params: {'code': code, 'worker': worker}),
            languageCode: l10n.locale.languageCode,
          );
        } else if (booking.isCompleted) {
          AlertTtsService.speakAlert(
            alertId: 'job_completed_${booking.id}',
            localizedText: l10n.translate('alert_job_completed', params: {'code': code}),
            languageCode: l10n.locale.languageCode,
          );
        }
      });
    }

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const MainNavigationScreen(initialIndex: 1)),
              (route) => false,
            );
          },
        ),
        title: const Text('Sahkar Sewa'),
      ),
      body: bookingProvider.isLoading && booking == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Column(
                children: [
                  // Hero Icon & Confirmation Header
                  Container(
                    width: 68,
                    height: 68,
                    decoration: BoxDecoration(
                      color: booking?.isEmergency == true
                          ? const Color(0xFFFFF3E0)
                          : AppTheme.verifiedGreen.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      booking?.isEmergency == true ? Icons.bolt_rounded : Icons.check_circle_rounded,
                      size: 42,
                      color: booking?.isEmergency == true ? const Color(0xFFE65100) : AppTheme.verifiedGreen,
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (booking?.isEmergency == true) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF3E0),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFFFB74D)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.bolt_rounded, size: 16, color: Color(0xFFE65100)),
                          const SizedBox(width: 4),
                          Text(
                            l10n.tr('emergency_dispatch_badge'),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFFE65100),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  Text(
                    booking?.isCompleted == true
                        ? l10n.tr('job_completed')
                        : booking?.isActive == true
                            ? l10n.tr('worker_arriving')
                            : (booking?.isEmergency == true ? l10n.tr('emergency_requested') : l10n.tr('booking_confirmed')),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textPrimary,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    booking?.isCompleted == true
                        ? l10n.tr('service_marked_complete')
                        : (booking?.isEmergency == true
                            ? l10n.tr('priority_emergency_broadcast')
                            : l10n.tr('worker_preparing')),
                    style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),

                  // Live GPS Tracking & ETA Banner (Active Gig)
                  if (booking?.status == 'accepted' || booking?.status == 'arriving' || booking?.isEmergency == true) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: booking?.isEmergency == true
                              ? [const Color(0xFFFFF3E0), const Color(0xFFFFE0B2)]
                              : [const Color(0xFFE0F2FE), const Color(0xFFBAE6FD)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                        border: Border.all(
                          color: booking?.isEmergency == true
                              ? const Color(0xFFFFB74D)
                              : const Color(0xFF7DD3FC),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: (booking?.isEmergency == true ? Colors.orange : Colors.blue).withValues(alpha: 0.08),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.06),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Icon(
                              booking?.isEmergency == true ? Icons.bolt_rounded : Icons.near_me_rounded,
                              color: booking?.isEmergency == true ? const Color(0xFFE65100) : const Color(0xFF0284C7),
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF10B981),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      booking?.isEmergency == true
                                          ? l10n.tr('live_emergency_en_route')
                                          : l10n.tr('live_gps_telemetry_banner'),
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.8,
                                        color: booking?.isEmergency == true ? const Color(0xFFB45309) : const Color(0xFF0369A1),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  l10n.tr('est_arrival_banner', params: {'time': '8–12'}),
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                Text(
                                  l10n.tr('worker_transit_dist', params: {'distance': '2.4'}),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF475569),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Tracking Stepper Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceWhite,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                      boxShadow: AppTheme.cardShadow,
                      border: Border.all(color: AppTheme.borderLight.withValues(alpha: 0.8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.tr('tracking'),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 18),
                        _buildStep(
                          title: l10n.tr('step_requested'),
                          time: '10:05 AM',
                          isDone: true,
                          isLast: false,
                        ),
                        _buildStep(
                          title: l10n.tr('step_accepted'),
                          time: '10:12 AM',
                          isDone: true,
                          isLast: false,
                        ),
                        _buildStep(
                          title: l10n.tr('step_arriving'),
                          time: 'Est. 10:45 AM',
                          isDone: booking?.isActive == true || booking?.isCompleted == true,
                          isCurrent: booking?.status == 'requested',
                          isLast: false,
                        ),
                        _buildStep(
                          title: l10n.tr('step_completed'),
                          time: booking?.isCompleted == true ? l10n.tr('step_done') : l10n.tr('step_pending'),
                          isDone: booking?.isCompleted == true,
                          isLast: true,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Professional Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceWhite,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                      boxShadow: AppTheme.cardShadow,
                      border: Border.all(color: AppTheme.borderLight.withValues(alpha: 0.8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.tr('your_professional'),
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textMuted, letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Stack(
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: const BoxDecoration(
                                    color: AppTheme.lightBlueBg,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      booking?.workerName?.isNotEmpty == true ? booking!.workerName![0].toUpperCase() : 'W',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primaryBlue),
                                    ),
                                  ),
                                ),
                                Positioned(
                                  right: 0,
                                  bottom: 0,
                                  child: Container(
                                    width: 14,
                                    height: 14,
                                    decoration: const BoxDecoration(
                                      color: AppTheme.verifiedGreen,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.check, size: 9, color: Colors.white),
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
                                    booking?.workerName ?? l10n.tr('cooperative_partner'),
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                                  ),
                                  const SizedBox(height: 2),
                                  const Row(
                                    children: [
                                      Icon(Icons.star_rounded, size: 14, color: AppTheme.ratingYellow),
                                      SizedBox(width: 2),
                                      Text(
                                        '4.9 (120 jobs)',
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: AppButton(
                                label: l10n.tr('message'),
                                icon: Icons.chat_bubble_outline_rounded,
                                variant: ButtonVariant.soft,
                                height: 44,
                                onPressed: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('In-app messaging will be available in V2. Please use the Call button for direct contact.'),
                                    ),
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Container(
                              height: 44,
                              width: 48,
                              decoration: BoxDecoration(
                                color: AppTheme.lightBlueBg,
                                borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                              ),
                              child: IconButton(
                                icon: const Icon(Icons.call_rounded, color: AppTheme.primaryBlue, size: 20),
                                onPressed: () async {
                                  final phone = booking?.workerPhone;
                                  if (phone != null && phone.trim().isNotEmpty) {
                                    final uri = Uri.parse('tel:$phone');
                                    if (await canLaunchUrl(uri)) {
                                      await launchUrl(uri);
                                    } else if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Could not open phone dialer for $phone')),
                                      );
                                    }
                                  } else {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Worker phone number is not available for this booking.'),
                                        ),
                                      );
                                    }
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Details Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceWhite,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                      boxShadow: AppTheme.cardShadow,
                      border: Border.all(color: AppTheme.borderLight.withValues(alpha: 0.8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              l10n.tr('details'),
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                            ),
                            Text(
                              l10n.tr('booking_id_prefix', params: {'code': booking?.shortCode ?? (booking?.id.substring(0, 8).toUpperCase() ?? "CG-8829")}),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textMuted),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        const Divider(height: 1, color: AppTheme.dividerColor),
                        const SizedBox(height: 14),
                        _buildDetailRow(
                          icon: Icons.handyman_outlined,
                          title: l10n.tr('service_label'),
                          content: '${l10n.tr(booking?.skillCategory.toLowerCase() ?? "electrician").toUpperCase()} ${l10n.tr('work_suffix')}',
                        ),
                        const SizedBox(height: 12),
                        _buildDetailRow(
                          icon: Icons.calendar_today_outlined,
                          title: l10n.tr('datetime_label'),
                          content: booking?.scheduledTime ?? 'Today, 10:00 AM - 12:00 PM',
                        ),
                        const SizedBox(height: 12),
                        _buildDetailRow(
                          icon: Icons.location_on_outlined,
                          title: l10n.tr('location_label'),
                          content: booking?.serviceAddress ?? 'Service Address',
                        ),
                        const SizedBox(height: 16),
                        const Divider(height: 1, color: AppTheme.dividerColor),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              l10n.tr('est_total_label'),
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                            ),
                            Text(
                              CurrencyFormatter.formatWithDecimals(booking?.totalAmount ?? 950.0),
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Complete Service Action Button
                  if (booking?.isCompleted != true) ...[
                    AppButton(
                      label: l10n.tr('complete_service_pay'),
                      suffixIcon: Icons.arrow_forward_rounded,
                      isLoading: bookingProvider.isLoading,
                      onPressed: _handleCompleteService,
                    ),
                  ] else ...[
                    AppButton(
                      label: l10n.tr('invoice_title'),
                      icon: Icons.receipt_long_rounded,
                      onPressed: () {
                        if (booking != null) {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => PaymentInvoiceScreen(booking: booking),
                            ),
                          );
                        }
                      },
                    ),
                  ],
                  const SizedBox(height: 20),
                ],
              ),
            ),
    );
  }

  Widget _buildStep({
    required String title,
    required String time,
    required bool isDone,
    bool isCurrent = false,
    required bool isLast,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isDone
                    ? AppTheme.verifiedGreen
                    : isCurrent
                        ? AppTheme.primaryBlue
                        : const Color(0xFFE2E8F0),
              ),
              child: isDone
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : isCurrent
                      ? const Center(
                          child: SizedBox(
                            width: 8,
                            height: 8,
                            child: DecoratedBox(
                              decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                            ),
                          ),
                        )
                      : null,
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 32,
                color: isDone ? AppTheme.verifiedGreen.withOpacity(0.5) : const Color(0xFFE2E8F0),
              ),
          ],
        ),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isDone || isCurrent ? FontWeight.w700 : FontWeight.w500,
                color: isDone || isCurrent ? AppTheme.textPrimary : AppTheme.textMuted,
              ),
            ),
            Text(
              time,
              style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDetailRow({required IconData icon, required String title, required String content}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppTheme.textMuted),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppTheme.textMuted, letterSpacing: 0.5),
              ),
              const SizedBox(height: 2),
              Text(
                content,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

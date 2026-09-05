import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/currency.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/payment_model.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/app_button.dart';
import '../../widgets/status_badge.dart';
import '../payment/service_receipt_screen.dart';
import 'create_booking_screen.dart';

class BookingDetailsScreen extends StatefulWidget {
  final String bookingId;

  const BookingDetailsScreen({super.key, required this.bookingId});

  @override
  State<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends State<BookingDetailsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<BookingProvider>(context, listen: false).fetchBookingDetail(widget.bookingId);
      Provider.of<BookingProvider>(context, listen: false).fetchPaymentReceipt(widget.bookingId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final booking = bookingProvider.activeBooking;
    final payment = bookingProvider.currentPayment;
    final l10n = AppLocalizations.of(context);

    final workerName = booking?.workerName ?? l10n.tr('cooperative_partner');
    final localizedSkill = booking?.skillCategory != null ? l10n.tr(booking!.skillCategory.toLowerCase()).toUpperCase() : "";
    final trade = '$localizedSkill ${l10n.tr('service_suffix')}';

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(l10n.tr('booking_details_title')),
      ),
      body: bookingProvider.isLoading && booking == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Column(
                children: [
                  // Worker Header Card matching Figma
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceWhite,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                      boxShadow: AppTheme.cardShadow,
                      border: Border.all(
                        color: booking?.isEmergency == true
                            ? const Color(0xFFFFB74D)
                            : AppTheme.borderLight.withOpacity(0.8),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (booking?.isEmergency == true) ...[
                          Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF3E0),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFFFB74D)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.bolt_rounded, size: 14, color: Color(0xFFE65100)),
                                const SizedBox(width: 4),
                                Text(
                                  l10n.tr('emergency_service_badge'),
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFFE65100),
                                    letterSpacing: 0.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        Row(
                          children: [
                            Stack(
                              children: [
                                Container(
                                  width: 52,
                                  height: 52,
                                  decoration: BoxDecoration(
                                    color: booking?.isEmergency == true
                                        ? const Color(0xFFFFF3E0)
                                        : AppTheme.lightBlueBg,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      workerName.isNotEmpty ? workerName[0].toUpperCase() : 'W',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 20,
                                        color: booking?.isEmergency == true
                                            ? const Color(0xFFE65100)
                                            : AppTheme.primaryBlue,
                                      ),
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
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    workerName,
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                                  ),
                                  const SizedBox(height: 2),
                                  Row(
                                    children: [
                                      const Icon(Icons.handyman_outlined, size: 13, color: AppTheme.textSecondary),
                                      const SizedBox(width: 4),
                                      Text(
                                        trade,
                                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            StatusBadge(
                              label: booking?.status.toUpperCase() ?? 'COMPLETED',
                              type: booking?.isCompleted == true ? BadgeType.completed : BadgeType.upcoming,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Booking Info & Location Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceWhite,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                      boxShadow: AppTheme.cardShadow,
                      border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(l10n.tr('booking_id_label'), style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                            Text(
                              '#${booking?.shortCode ?? (booking?.id.substring(0, 8).toUpperCase() ?? "PLB-8492-X1")}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        const Divider(height: 1, color: AppTheme.dividerColor),
                        const SizedBox(height: 14),
                        _buildInfoRow(
                          icon: booking?.isEmergency == true ? Icons.bolt_rounded : Icons.calendar_today_outlined,
                          title: l10n.tr('date_time_label'),
                          content: booking?.isEmergency == true || booking?.scheduledTime == 'immediate'
                              ? l10n.tr('immediate_dispatch_asap')
                              : (booking?.scheduledTime ?? 'Oct 24, 2026 • 09:00 AM - 11:30 AM'),
                        ),
                        const SizedBox(height: 14),
                        _buildInfoRow(
                          icon: Icons.location_on_outlined,
                          title: l10n.tr('service_location_label'),
                          content: booking?.serviceAddress ?? '123 Pine St, Kolkata, WB',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Journey Section matching Figma
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceWhite,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                      boxShadow: AppTheme.cardShadow,
                      border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.tr('journey_label'),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 16),
                        _buildJourneyItem(l10n.tr('step_requested'), '08:15 AM', true),
                        _buildJourneyItem(l10n.tr('step_accepted'), '08:22 AM', true),
                        _buildJourneyItem(l10n.tr('step_arriving'), '08:55 AM', true),
                        _buildJourneyItem(l10n.tr('step_completed'), '11:30 AM', booking?.isCompleted ?? true, isLast: true),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Payment Summary Section
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceWhite,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                      boxShadow: AppTheme.cardShadow,
                      border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.tr('payment_summary_title'),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 14),
                        _buildPaymentRow(l10n.tr('labor_charge'), 1500.0),
                        const SizedBox(height: 8),
                        _buildPaymentRow(l10n.tr('parts_charge'), 455.0),
                        const SizedBox(height: 8),
                        _buildPaymentRow(l10n.tr('coop_service_fee'), 120.0),
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12.0),
                          child: Divider(height: 1, color: AppTheme.dividerColor),
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              l10n.tr('total_paid'),
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                            ),
                            Text(
                              CurrencyFormatter.formatWithDecimals(booking?.totalAmount ?? 2075.0),
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.primaryBlue),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.credit_card_rounded, size: 18, color: AppTheme.primaryBlue),
                              const SizedBox(width: 8),
                              Text(l10n.tr('upi_digital_payment'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                              const Spacer(),
                              const Icon(Icons.check_circle_rounded, size: 16, color: AppTheme.verifiedGreen),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Your Rating Section
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceWhite,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                      boxShadow: AppTheme.cardShadow,
                      border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              l10n.tr('your_rating_title'),
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                            ),
                            Row(
                              children: List.generate(
                                5,
                                (_) => const Icon(Icons.star_rounded, size: 18, color: AppTheme.ratingYellow),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          '"Excellent, fast service and very courteous worker."',
                          style: TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Bottom Action Buttons matching Figma
                  AppButton(
                    label: l10n.tr('download_receipt'),
                    icon: Icons.download_rounded,
                    onPressed: () {
                      if (booking != null) {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ServiceReceiptScreen(
                              booking: booking,
                              payment: payment ??
                                  PaymentModel(
                                    id: 'pay_demo',
                                    bookingId: booking.id,
                                    amount: booking.totalAmount,
                                    platformCommission: 60.0,
                                    welfareDeduction: 24.0,
                                    workerPayout: booking.totalAmount - 84.0,
                                    status: 'paid',
                                    createdAt: DateTime.now().toIso8601String(),
                                  ),
                            ),
                          ),
                        );
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  AppButton(
                    label: l10n.tr('rebook_service'),
                    icon: Icons.refresh_rounded,
                    variant: ButtonVariant.outlined,
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CreateBookingScreen(
                            skillCategory: booking?.skillCategory ?? 'electrician',
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildInfoRow({required IconData icon, required String title, required String content}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppTheme.primaryBlue),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
              const SizedBox(height: 2),
              Text(content, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildJourneyItem(String title, String time, bool isCompleted, {bool isLast = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCompleted ? AppTheme.verifiedGreen : const Color(0xFFE2E8F0),
              ),
              child: isCompleted ? const Icon(Icons.check, size: 13, color: Colors.white) : null,
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 24,
                color: isCompleted ? AppTheme.verifiedGreen.withOpacity(0.5) : const Color(0xFFE2E8F0),
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
          ),
        ),
        Text(
          time,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppTheme.textMuted),
        ),
      ],
    );
  }

  Widget _buildPaymentRow(String title, double amount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        Text(
          CurrencyFormatter.formatWithDecimals(amount),
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
        ),
      ],
    );
  }
}

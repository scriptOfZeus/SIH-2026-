import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/currency.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/booking_model.dart';
import '../../models/payment_model.dart';
import '../../providers/customer_provider.dart';
import '../../services/receipt_pdf_service.dart';
import '../../widgets/app_button.dart';
import '../home/main_navigation_screen.dart';
import '../rating/rating_feedback_screen.dart';

class ServiceReceiptScreen extends StatelessWidget {
  final BookingModel booking;
  final PaymentModel payment;

  const ServiceReceiptScreen({
    super.key,
    required this.booking,
    required this.payment,
  });

  @override
  Widget build(BuildContext context) {
    final customer = Provider.of<CustomerProvider>(context).profile;
    final l10n = AppLocalizations.of(context);

    final customerName = customer?.fullName ?? 'Valued Customer';
    final workerName = booking.workerName ?? 'Elena Rodriguez';
    final serviceType = '${l10n.tr(booking.skillCategory.toLowerCase()).toUpperCase()} ${l10n.tr('service_suffix')}';

    final double baseAmount = payment.amount > 0 ? payment.amount * 0.85 : 1200.0;
    final double platformFee = payment.platformCommission > 0 ? payment.platformCommission : 60.0;
    final double coopContribution = payment.welfareDeduction > 0 ? payment.welfareDeduction : 24.0;
    final double totalPaid = payment.amount > 0 ? payment.amount : (baseAmount + platformFee);

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
              (route) => false,
            );
          },
        ),
        title: Text(l10n.tr('app_title')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
        child: Column(
          children: [
            // Green Success Hero
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: Color(0xFF047857),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_rounded, color: Colors.white, size: 36),
            ),
            const SizedBox(height: 14),
            Text(
              l10n.tr('payment_successful'),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              l10n.tr('feedback_thank_you'),
              style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 24),

            // Official Service Receipt Card matching Figma
            Container(
              decoration: BoxDecoration(
                color: AppTheme.surfaceWhite,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                boxShadow: AppTheme.cardShadow,
                border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Blue Accent Top Bar
                  Container(
                    height: 6,
                    decoration: const BoxDecoration(
                      color: AppTheme.primaryBlue,
                      borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusLarge)),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Text(
                            l10n.tr('receipt_btn').toUpperCase(),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.textSecondary,
                              letterSpacing: 1.0,
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),

                        // Booking ID & Date Issued
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(l10n.tr('booking_id_label'), style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                Text(
                                  '#CG-${booking.shortCode ?? booking.id.substring(0, 6).toUpperCase()}',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(l10n.tr('date_time_label'), style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                Text(
                                  booking.scheduledTime.isNotEmpty ? booking.scheduledTime : 'Today',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(height: 1, color: AppTheme.dividerColor),
                        const SizedBox(height: 16),

                        _buildReceiptRow(l10n.tr('customer_label'), customerName),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(l10n.tr('your_professional'), style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                            Row(
                              children: [
                                Text(workerName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                                const SizedBox(width: 4),
                                const Icon(Icons.verified, size: 14, color: AppTheme.verifiedGreen),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _buildReceiptRow(l10n.tr('service_label'), serviceType),
                        const SizedBox(height: 12),
                        _buildReceiptRow(l10n.tr('date_time_label'), booking.scheduledTime.isNotEmpty ? booking.scheduledTime : 'Today • 10:00 AM'),
                        const SizedBox(height: 12),
                        _buildReceiptRow(l10n.tr('location_label'), booking.serviceAddress),
                        const SizedBox(height: 18),

                        // Itemized Amount Box matching Figma
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F6FE),
                            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          ),
                          child: Column(
                            children: [
                              _buildAmountRow(l10n.tr('labor_charge'), baseAmount),
                              const SizedBox(height: 8),
                              _buildAmountRow(l10n.tr('coop_service_fee'), platformFee),
                              const SizedBox(height: 8),
                              _buildAmountRow(l10n.tr('platform_welfare_contribution'), coopContribution, isGreen: true),
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 10.0),
                                child: Divider(height: 1, color: Color(0xFFD6E4FC)),
                              ),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    l10n.tr('total_paid'),
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                                  ),
                                  Text(
                                    CurrencyFormatter.formatWithDecimals(totalPaid),
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.primaryBlue),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Payment Method / Transaction Box
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE2ECFE),
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.payment_rounded, color: AppTheme.primaryBlue, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  l10n.tr('upi_digital_payment'),
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                                ),
                              ),
                              Text(
                                'TXN: ${payment.razorpayPaymentId ?? (payment.id.isNotEmpty ? payment.id.substring(0, 6).toUpperCase() : "99A2B4")}',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Actions: Share Receipt + Download PDF + Rate Worker
            Row(
              children: [
                Expanded(
                  child: AppButton(
                    label: l10n.tr('receipt_btn'),
                    icon: Icons.share_outlined,
                    variant: ButtonVariant.outlined,
                    onPressed: () async {
                      try {
                        await ReceiptPdfService.shareReceipt(
                          booking: booking,
                          payment: payment,
                          customerName: customerName,
                          customerPhone: customer?.phone,
                          customerAddress: customer?.defaultAddress,
                        );
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Could not share receipt: $e')),
                          );
                        }
                      }
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: AppButton(
                    label: l10n.tr('download_receipt'),
                    icon: Icons.download_rounded,
                    onPressed: () async {
                      try {
                        await ReceiptPdfService.downloadOrPrintReceipt(
                          booking: booking,
                          payment: payment,
                          customerName: customerName,
                          customerPhone: customer?.phone,
                          customerAddress: customer?.defaultAddress,
                        );
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Could not generate PDF: $e')),
                          );
                        }
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Proceed to Rating button
            AppButton(
              label: l10n.tr('rate_service_btn'),
              icon: Icons.star_outline_rounded,
              variant: ButtonVariant.soft,
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => RatingFeedbackScreen(booking: booking),
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

  Widget _buildReceiptRow(String title, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
          ),
        ),
      ],
    );
  }

  Widget _buildAmountRow(String title, double amount, {bool isGreen = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: TextStyle(fontSize: 13, color: isGreen ? AppTheme.verifiedGreen : AppTheme.textSecondary)),
        Text(
          CurrencyFormatter.formatWithDecimals(amount),
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isGreen ? AppTheme.verifiedGreen : AppTheme.textPrimary),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/currency.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../services/alert_tts_service.dart';
import '../../services/dispute_service.dart';
import '../../widgets/app_button.dart';
import 'service_receipt_screen.dart';

class PaymentInvoiceScreen extends StatefulWidget {
  final BookingModel booking;

  const PaymentInvoiceScreen({super.key, required this.booking});

  @override
  State<PaymentInvoiceScreen> createState() => _PaymentInvoiceScreenState();
}

class _PaymentInvoiceScreenState extends State<PaymentInvoiceScreen> {
  String _selectedMethod = 'upi';

  void _showDisputeDialog() {
    final reasonController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.gavel_rounded, color: AppTheme.errorRed),
                SizedBox(width: 8),
                Text('Raise a Dispute', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Describe the issue with this booking. A cooperative federation officer will review and adjudicate.',
                  style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: reasonController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'e.g., Service was incomplete or incorrect charges applied...',
                    hintStyle: const TextStyle(fontSize: 13, color: AppTheme.textMuted),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: isSubmitting ? null : () => Navigator.of(ctx).pop(),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.errorRed,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: isSubmitting
                    ? null
                    : () async {
                        final reason = reasonController.text.trim();
                        if (reason.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please provide a reason for the dispute.')),
                          );
                          return;
                        }

                        setDialogState(() => isSubmitting = true);
                        try {
                          final result = await DisputeService.submitDispute(
                            bookingId: widget.booking.id,
                            reason: reason,
                          );

                          if (!mounted) return;
                          Navigator.of(ctx).pop();

                          final disputeNo = result != null ? result['dispute_number'] ?? result['id'] : 'DSP-PENDING';
                          showDialog(
                            context: context,
                            builder: (context) => AlertDialog(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              title: const Row(
                                children: [
                                  Icon(Icons.check_circle_rounded, color: AppTheme.verifiedGreen),
                                  SizedBox(width: 8),
                                  Text('Dispute Registered'),
                                ],
                              ),
                              content: Text('Your dispute has been logged under reference $disputeNo. A federation representative will review it.'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.of(context).pop(),
                                  child: const Text('OK'),
                                ),
                              ],
                            ),
                          );
                        } catch (e) {
                          setDialogState(() => isSubmitting = false);
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Failed to submit dispute: $e')),
                          );
                        }
                      },
                child: isSubmitting
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Submit Dispute', style: TextStyle(color: Colors.white)),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _handlePayment() async {
    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);

    final payment = await bookingProvider.initiatePayment(
      bookingId: widget.booking.id,
      amount: widget.booking.totalAmount,
    );

    if (payment != null && mounted) {
      final l10n = AppLocalizations.of(context);
      AlertTtsService.speakAlert(
        alertId: 'payment_${widget.booking.id}',
        localizedText: l10n.translate('alert_payment_successful', params: {
          'amount': widget.booking.totalAmount.toStringAsFixed(0),
        }),
        languageCode: l10n.locale.languageCode,
      );

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => ServiceReceiptScreen(
            booking: widget.booking,
            payment: payment,
          ),
        ),
      );
    } else if (mounted && bookingProvider.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(bookingProvider.errorMessage!),
          backgroundColor: AppTheme.dangerRed,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final l10n = AppLocalizations.of(context);

    final double serviceAmount = widget.booking.grossAmount ?? (widget.booking.totalAmount > 0 ? widget.booking.totalAmount : 300.0);
    final double partsAmount = widget.booking.partsFee;
    final double total = serviceAmount + partsAmount;
    final int qty = widget.booking.effectiveQuantity > 0 ? widget.booking.effectiveQuantity : widget.booking.quantity;
    final double unitPrice = widget.booking.serviceUnitPrice ?? (serviceAmount / (qty > 0 ? qty : 1));

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(l10n.tr('invoice_title')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title & Invoice Number
            Text(
              l10n.tr('payment_breakdown'),
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Invoice #INV-2026-${widget.booking.shortCode ?? widget.booking.id.substring(0, 4).toUpperCase()}',
              style: const TextStyle(fontSize: 13, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 20),

            // Itemized Bill Card
            Container(
              decoration: BoxDecoration(
                color: AppTheme.surfaceWhite,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                boxShadow: AppTheme.cardShadow,
                border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
              ),
              child: Column(
                children: [
                  // Worker Header
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.lightBlueBg,
                          ),
                          child: Center(
                            child: Text(
                              widget.booking.workerName?.isNotEmpty == true ? widget.booking.workerName![0].toUpperCase() : 'W',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primaryBlue),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.booking.workerName ?? 'Elena Rodriguez',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.handyman_outlined, size: 13, color: AppTheme.textSecondary),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${l10n.tr(widget.booking.skillCategory.toLowerCase()).toUpperCase()} ${l10n.tr('work_suffix')}',
                                    style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1, color: AppTheme.dividerColor),

                  // Line Items
                  Padding(
                    padding: const EdgeInsets.all(18.0),
                    child: Column(
                      children: [
                        _buildBillRow(
                          '${l10n.tr('labor_charge')} (2h)',
                          widget.booking.serviceId != null ? 'Service ${widget.booking.serviceId} • Qty: $qty' : 'Standard Rate',
                          serviceAmount,
                        ),
                        if (partsAmount > 0) ...[
                          const SizedBox(height: 12),
                          _buildBillRow(
                            l10n.tr('parts_charge'),
                            widget.booking.serviceNotes ?? 'Replacement Valve, Sealant',
                            partsAmount,
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Total Amount Box matching Figma
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: const BoxDecoration(
                      color: Color(0xFFEEF4FF),
                      borderRadius: BorderRadius.vertical(bottom: Radius.circular(AppTheme.radiusLarge)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          l10n.tr('total_payable'),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                        ),
                        Text(
                          CurrencyFormatter.formatWithDecimals(total),
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppTheme.primaryBlue),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Payment Method Section
            Text(
              l10n.tr('payment_summary_title'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 12),

            // UPI / Card Selector Box
            GestureDetector(
              onTap: () {
                setState(() {
                  _selectedMethod = _selectedMethod == 'upi' ? 'card' : 'upi';
                });
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceWhite,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  border: Border.all(color: AppTheme.primaryBlue, width: 1.5),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E3A8A),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(_selectedMethod.toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.tr('upi_digital_payment'),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                          ),
                          const Text(
                            'Razorpay Secure Instant Checkout',
                            style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.radio_button_checked, color: AppTheme.primaryBlue),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Action Buttons Row (Dispute + Pay)
            Row(
              children: [
                Expanded(
                  flex: 1,
                  child: AppButton(
                    label: l10n.tr('raise_dispute'),
                    variant: ButtonVariant.outlined,
                    onPressed: _showDisputeDialog,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: AppButton(
                    label: '${l10n.tr('pay_now', params: {'amount': ''}).replaceAll('₹', '').trim()} ${CurrencyFormatter.formatWithDecimals(total)}',
                    icon: Icons.lock_outline_rounded,
                    isLoading: bookingProvider.isLoading,
                    onPressed: _handlePayment,
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

  Widget _buildBillRow(String title, String subtitle, double amount, {bool isGreen = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isGreen ? AppTheme.verifiedGreen : AppTheme.textPrimary,
              ),
            ),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
            ),
          ],
        ),
        Text(
          CurrencyFormatter.formatWithDecimals(amount),
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: isGreen ? AppTheme.verifiedGreen : AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}

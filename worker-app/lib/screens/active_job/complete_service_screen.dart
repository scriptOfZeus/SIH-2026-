import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/currency.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../models/worker_booking_model.dart';
import '../../providers/worker_booking_provider.dart';
import '../../services/worker_alert_tts_service.dart';
import '../../widgets/app_button.dart';
import '../home/worker_main_screen.dart';

class CompleteServiceScreen extends StatefulWidget {
  final WorkerBooking booking;

  const CompleteServiceScreen({
    super.key,
    required this.booking,
  });

  @override
  State<CompleteServiceScreen> createState() => _CompleteServiceScreenState();
}

class _CompleteServiceScreenState extends State<CompleteServiceScreen> {
  final TextEditingController _notesController = TextEditingController();
  double _partsAmount = 0.0;
  String _partsDescription = '';
  bool _isCompleting = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  double get _totalEarnings => widget.booking.laborRate + _partsAmount;

  void _showAddPartsDialog() {
    final l10n = WorkerLocalizations.of(context);
    final descCtrl = TextEditingController(text: _partsDescription);
    final amountCtrl = TextEditingController(text: _partsAmount > 0 ? _partsAmount.toInt().toString() : '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.tr('add_replacement_parts')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: descCtrl,
              decoration: InputDecoration(
                labelText: l10n.tr('parts_description'),
                hintText: 'e.g., 32A MCB switch, 10m Copper Wire',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: l10n.tr('parts_cost'),
                hintText: 'e.g., 450',
                prefixText: '₹ ',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(l10n.tr('cancel')),
          ),
          ElevatedButton(
            onPressed: () {
              final amt = double.tryParse(amountCtrl.text.trim()) ?? 0.0;
              setState(() {
                _partsAmount = amt;
                _partsDescription = descCtrl.text.trim();
              });
              Navigator.of(ctx).pop();
            },
            child: Text(l10n.tr('add_parts_btn')),
          ),
        ],
      ),
    );
  }

  Future<void> _handleCompleteService() async {
    setState(() => _isCompleting = true);
    final bookingProvider = Provider.of<WorkerBookingProvider>(context, listen: false);

    final success = await bookingProvider.completeActiveJob(
      id: widget.booking.id,
      partsFee: _partsAmount,
      serviceNotes: _notesController.text.trim(),
    );

    if (mounted) {
      setState(() => _isCompleting = false);
      if (success) {
        final l10n = WorkerLocalizations.of(context);
        WorkerAlertTtsService.speakAlert(
          alertId: 'payment_confirmed_${widget.booking.id}',
          localizedText: l10n.alertPaymentConfirmed(_totalEarnings),
        );

        // Show completion modal
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: Row(
              children: [
                const Icon(Icons.check_circle, color: AppTheme.verifiedGreen),
                const SizedBox(width: 8),
                Text(l10n.tr('job_completed_modal_title')),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Service successfully finalized for ${widget.booking.customerName}.',
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 12),
                Text(
                  'Total Payout: ${CurrencyFormatter.format(_totalEarnings)}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.primaryDark),
                ),
              ],
            ),
            actions: [
              ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const WorkerMainScreen(initialTabIndex: 0)),
                    (route) => false,
                  );
                },
                child: Text(l10n.tr('back_to_dashboard')),
              ),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(bookingProvider.errorMessage ?? 'Failed to complete job'),
            backgroundColor: AppTheme.dangerRed,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = WorkerLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        title: Text(l10n.tr('complete_service_title')),
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
            // Customer Header Card
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
                        Text(
                          widget.booking.customerName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${widget.booking.skillCategory.toUpperCase()} Service',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.access_time, size: 13, color: AppTheme.textSecondary),
                              const SizedBox(width: 4),
                              Text(
                                'Duration: ${widget.booking.estimatedDuration}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textSecondary,
                                ),
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
            const SizedBox(height: 16),

            // Hero Worker Earnings Card (Blue Filled)
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.primaryBlue,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                boxShadow: AppTheme.primaryButtonShadow,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.tr('worker_earnings'),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Colors.white70,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        CurrencyFormatter.format(_totalEarnings),
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.account_balance_wallet, color: Colors.white, size: 24),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Billing Breakdown Card
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
                    l10n.tr('billing_breakdown'),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textSecondary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 14),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(l10n.tr('labor'), style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary)),
                      Text(
                        CurrencyFormatter.format(widget.booking.laborRate),
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textDark),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _partsDescription.isNotEmpty ? '${l10n.tr('parts')} ($_partsDescription)' : l10n.tr('parts'),
                        style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary),
                      ),
                      Text(
                        CurrencyFormatter.format(_partsAmount),
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textDark),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1, color: AppTheme.dividerColor),
                  const SizedBox(height: 14),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        l10n.tr('total'),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textDark),
                      ),
                      Text(
                        CurrencyFormatter.format(_totalEarnings),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.textDark,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // + ADD PARTS Button
            AppButton(
              text: l10n.tr('add_parts_btn'),
              type: ButtonType.outlined,
              onPressed: _showAddPartsDialog,
            ),
            const SizedBox(height: 18),

            // Service Notes (Optional)
            Text(
              l10n.tr('service_notes_optional'),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppTheme.textDark,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: l10n.tr('service_notes_hint'),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  borderSide: const BorderSide(color: AppTheme.borderLight),
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Proof of Work Placeholder
            Text(
              l10n.tr('proof_of_work'),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppTheme.textDark,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                border: Border.all(
                  color: AppTheme.borderLight,
                  style: BorderStyle.solid,
                ),
              ),
              child: Column(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Icon(Icons.camera_alt, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.tr('upload_service_photos'),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textDark,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    l10n.tr('take_photos_desc'),
                    style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Complete Service Action Button
            AppButton(
              text: l10n.tr('btn_complete_service'),
              suffixIcon: Icons.arrow_forward,
              type: ButtonType.primary,
              isLoading: _isCompleting,
              onPressed: _handleCompleteService,
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

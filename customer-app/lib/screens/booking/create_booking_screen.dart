import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/currency.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/worker_model.dart';
import '../../providers/booking_provider.dart';
import '../../providers/customer_provider.dart';
import '../../widgets/app_button.dart';
import 'booking_status_screen.dart';

enum BookingMode { scheduled, emergency }

class CreateBookingScreen extends StatefulWidget {
  final WorkerModel? worker;
  final String skillCategory;

  const CreateBookingScreen({
    super.key,
    this.worker,
    this.skillCategory = 'electrician',
  });

  @override
  State<CreateBookingScreen> createState() => _CreateBookingScreenState();
}

class _CreateBookingScreenState extends State<CreateBookingScreen> {
  BookingMode _bookingMode = BookingMode.scheduled;
  int _selectedDateIndex = 1; // Default to tomorrow
  String _selectedTime = '10:00 AM';
  late String _address;
  final TextEditingController _problemController = TextEditingController();
  bool _isSubmitting = false;

  final List<DateTime> _availableDates = List.generate(
    5,
    (i) => DateTime.now().add(Duration(days: i)),
  );

  final List<String> _morningTimes = ['08:00 AM', '09:00 AM', '10:00 AM'];
  final List<String> _afternoonTimes = ['12:00 PM', '01:00 PM', '02:00 PM'];

  @override
  void initState() {
    super.initState();
    final customer = Provider.of<CustomerProvider>(context, listen: false);
    _address = customer.profile?.defaultAddress ?? 'Park Street, Kolkata, WB 700016';
  }

  @override
  void dispose() {
    _problemController.dispose();
    super.dispose();
  }

  Future<void> _handleScheduledSubmit() async {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);

    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    final selectedDate = _availableDates[_selectedDateIndex];
    final dateStr = DateFormat('yyyy-MM-dd').format(selectedDate);
    final scheduledDateTimeStr = '$dateStr $_selectedTime';

    final category = widget.worker?.skillCategory ?? widget.skillCategory;

    final booking = await bookingProvider.createScheduledBooking(
      skillCategory: category,
      serviceAddress: _address,
      serviceLat: 22.5726,
      serviceLng: 88.3639,
      scheduledTime: scheduledDateTimeStr,
      workerId: widget.worker?.id,
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (booking != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => BookingStatusScreen(bookingId: booking.id),
        ),
      );
    } else if (bookingProvider.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(bookingProvider.errorMessage!),
          backgroundColor: AppTheme.dangerRed,
        ),
      );
    }
  }

  Future<void> _handleEmergencySubmit() async {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);

    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    final category = widget.worker?.skillCategory ?? widget.skillCategory;

    final booking = await bookingProvider.createEmergencyBooking(
      skillCategory: category,
      serviceAddress: _address,
      serviceLat: 22.5726,
      serviceLng: 88.3639,
      emergencyFee: 50.0,
      timeoutSeconds: 60,
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (booking != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => BookingStatusScreen(bookingId: booking.id),
        ),
      );
    } else {
      final message = bookingProvider.errorMessage ??
          'No emergency workers are currently available nearby. Try again shortly or schedule a normal booking.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: const Color(0xFFE65100),
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: 'Schedule',
            textColor: Colors.white,
            onPressed: () {
              setState(() => _bookingMode = BookingMode.scheduled);
            },
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final double hourlyRate = widget.worker?.hourlyRate ?? 450.0;
    final double serviceRate = hourlyRate * 2;
    const double coopFee = 50.0;
    const double emergencyPriorityFee = 50.0;
    final double scheduledTotal = serviceRate + coopFee;
    final double emergencyTotal = serviceRate + coopFee + emergencyPriorityFee;

    final bool isEmergency = _bookingMode == BookingMode.emergency;

    final l10n = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(isEmergency ? l10n.tr('emergency_booking') : l10n.tr('confirm_booking')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Mode Selector Switcher
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppTheme.borderLight.withOpacity(0.45),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _bookingMode = BookingMode.scheduled),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: !isEmergency ? AppTheme.surfaceWhite : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: !isEmergency
                              ? [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 4, offset: const Offset(0, 2))]
                              : null,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.calendar_today_rounded,
                              size: 15,
                              color: !isEmergency ? AppTheme.primaryBlue : AppTheme.textSecondary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              l10n.tr('scheduled_service'),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: !isEmergency ? FontWeight.w700 : FontWeight.w500,
                                color: !isEmergency ? AppTheme.primaryBlue : AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _bookingMode = BookingMode.emergency),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: isEmergency ? AppTheme.surfaceWhite : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: isEmergency
                              ? [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 4, offset: const Offset(0, 2))]
                              : null,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.bolt_rounded,
                              size: 17,
                              color: isEmergency ? const Color(0xFFE65100) : AppTheme.textSecondary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              l10n.tr('emergency_dispatch_badge'),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isEmergency ? FontWeight.w700 : FontWeight.w500,
                                color: isEmergency ? const Color(0xFFE65100) : AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Emergency Notice Banner if Emergency Mode
            if (isEmergency) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF8F1),
                  borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                  border: Border.all(color: const Color(0xFFFFCC80), width: 1.2),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Color(0xFFFFE0B2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.bolt_rounded, size: 20, color: Color(0xFFE65100)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Immediate On-Demand Dispatch',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFBF360C),
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Request the nearest available verified worker for urgent assistance. Arrival is dispatched ASAP upon acceptance.',
                            style: TextStyle(fontSize: 12, height: 1.35, color: Color(0xFF795548)),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFE0B2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              '⚡ Expected Urgency: ASAP (Immediate)',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFFD84315),
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
            ],

            // Worker / Service Summary Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surfaceWhite,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                boxShadow: AppTheme.cardShadow,
                border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isEmergency ? const Color(0xFFFFF3E0) : AppTheme.lightBlueBg,
                      border: Border.all(
                        color: isEmergency ? const Color(0xFFFFB74D) : AppTheme.primaryBlue.withOpacity(0.15),
                      ),
                    ),
                    child: Center(
                      child: isEmergency && widget.worker == null
                          ? const Icon(Icons.bolt_rounded, color: Color(0xFFE65100), size: 26)
                          : Text(
                              widget.worker?.fullName.isNotEmpty == true ? widget.worker!.fullName[0].toUpperCase() : 'W',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: isEmergency ? const Color(0xFFE65100) : AppTheme.primaryBlue,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isEmergency && widget.worker == null
                              ? 'Nearest Available Professional'
                              : (widget.worker?.fullName ?? 'Verified Professional'),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Icon(Icons.verified, size: 14, color: AppTheme.verifiedGreen),
                            const SizedBox(width: 4),
                            Text(
                              (widget.worker?.skillCategory ?? widget.skillCategory).toUpperCase(),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Icon(Icons.star_rounded, size: 14, color: AppTheme.ratingYellow),
                            const SizedBox(width: 2),
                            Text(
                              '${widget.worker?.avgRating ?? 4.9} (${widget.worker?.totalJobs ?? 120} reviews)',
                              style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Text(
                    CurrencyFormatter.formatRate(hourlyRate),
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: isEmergency ? const Color(0xFFE65100) : AppTheme.primaryBlue,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Service Location
            const Text(
              'Service Location',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: AppTheme.surfaceWhite,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                border: Border.all(color: AppTheme.borderLight),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: isEmergency ? const Color(0xFFFFF3E0) : AppTheme.lightBlueBg,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.location_on,
                      color: isEmergency ? const Color(0xFFE65100) : AppTheme.primaryBlue,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _address,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Emergency Specific Issue Input Field
            if (isEmergency) ...[
              const Text(
                'Describe Urgent Issue (Optional)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _problemController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'e.g., Water leakage in kitchen, main fuse blown, urgent repair needed...',
                  hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                  filled: true,
                  fillColor: AppTheme.surfaceWhite,
                  contentPadding: const EdgeInsets.all(14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    borderSide: const BorderSide(color: AppTheme.borderLight),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    borderSide: const BorderSide(color: AppTheme.borderLight),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    borderSide: const BorderSide(color: Color(0xFFE65100), width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Scheduled Date & Time if Scheduled Mode
            if (!isEmergency) ...[
              // Select Date
              const Text(
                'Select Date',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: List.generate(_availableDates.length, (index) {
                    final date = _availableDates[index];
                    final isSelected = index == _selectedDateIndex;
                    final dayName = DateFormat('E').format(date).toUpperCase();
                    final dayNumber = DateFormat('d').format(date);

                    return GestureDetector(
                      onTap: () => setState(() => _selectedDateIndex = index),
                      child: Container(
                        width: 64,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        margin: const EdgeInsets.only(right: 10),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primaryBlue : AppTheme.surfaceWhite,
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          border: Border.all(
                            color: isSelected ? AppTheme.primaryBlue : AppTheme.borderLight,
                            width: 1.5,
                          ),
                          boxShadow: isSelected ? AppTheme.primaryButtonShadow : null,
                        ),
                        child: Column(
                          children: [
                            Text(
                              dayName,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: isSelected ? Colors.white70 : AppTheme.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              dayNumber,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: isSelected ? Colors.white : AppTheme.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 20),

              // Select Time
              const Text(
                'Select Time',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 10),
              const Text('Morning', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
              const SizedBox(height: 6),
              Row(
                children: _morningTimes.map((time) => _buildTimeChip(time)).toList(),
              ),
              const SizedBox(height: 12),
              const Text('Afternoon', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
              const SizedBox(height: 6),
              Row(
                children: _afternoonTimes.map((time) => _buildTimeChip(time)).toList(),
              ),
              const SizedBox(height: 24),
            ],

            // Payment Summary Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: isEmergency ? const Color(0xFFFFF9F5) : const Color(0xFFF1F6FE),
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                border: Border.all(
                  color: isEmergency ? const Color(0xFFFFCC80) : AppTheme.primaryBlue.withOpacity(0.1),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.tr('payment_summary_title'),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(l10n.tr('labor_charge'), style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                      Text(
                        CurrencyFormatter.formatWithDecimals(serviceRate),
                        style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textPrimary, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(l10n.tr('coop_service_fee'), style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                      Text(
                        CurrencyFormatter.formatWithDecimals(coopFee),
                        style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textPrimary, fontSize: 13),
                      ),
                    ],
                  ),
                  if (isEmergency) ...[
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.bolt_rounded, size: 14, color: Color(0xFFE65100)),
                            const SizedBox(width: 4),
                            Text(
                              l10n.tr('emergency_dispatch_fee'),
                              style: const TextStyle(color: Color(0xFFE65100), fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                          ],
                        ),
                        Text(
                          CurrencyFormatter.formatWithDecimals(emergencyPriorityFee),
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFE65100), fontSize: 13),
                        ),
                      ],
                    ),
                  ],
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12.0),
                    child: Divider(height: 1, color: AppTheme.borderLight),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isEmergency ? l10n.tr('est_total_label') : l10n.tr('total_payable'),
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                      ),
                      Text(
                        CurrencyFormatter.formatWithDecimals(isEmergency ? emergencyTotal : scheduledTotal),
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: isEmergency ? const Color(0xFFE65100) : AppTheme.primaryBlue,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            if (isEmergency)
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE65100),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleAppBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
                    elevation: 2,
                    shadowColor: const Color(0xFFE65100).withOpacity(0.35),
                  ),
                  onPressed: (_isSubmitting || bookingProvider.isLoading) ? null : _handleEmergencySubmit,
                  child: (_isSubmitting || bookingProvider.isLoading)
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.bolt_rounded, size: 20, color: Colors.white),
                            const SizedBox(width: 8),
                            Text(
                              l10n.tr('request_sos'),
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.2),
                            ),
                          ],
                        ),
                ),
              )
            else
              AppButton(
                label: l10n.tr('confirm_booking'),
                suffixIcon: Icons.calendar_today_rounded,
                isLoading: _isSubmitting || bookingProvider.isLoading,
                onPressed: (_isSubmitting || bookingProvider.isLoading) ? null : _handleScheduledSubmit,
              ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeChip(String time) {
    final isSelected = time == _selectedTime;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedTime = time),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          margin: const EdgeInsets.only(right: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFE0EDFF) : AppTheme.surfaceWhite,
            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            border: Border.all(
              color: isSelected ? AppTheme.primaryBlue : AppTheme.borderLight,
              width: isSelected ? 1.5 : 1.0,
            ),
          ),
          child: Center(
            child: Text(
              time,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? AppTheme.primaryBlue : AppTheme.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class RoundedRectangleAppBorder extends RoundedRectangleBorder {
  const RoundedRectangleAppBorder({super.borderRadius});
}

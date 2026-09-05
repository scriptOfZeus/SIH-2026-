import 'package:flutter/material.dart';
import '../config/currency.dart';
import '../config/theme.dart';
import '../l10n/app_localizations.dart';
import '../models/booking_model.dart';
import 'status_badge.dart';

class BookingCard extends StatelessWidget {
  final BookingModel booking;
  final VoidCallback onTap;
  final VoidCallback? onAction;

  const BookingCard({
    super.key,
    required this.booking,
    required this.onTap,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    BadgeType badgeType;
    String badgeKey;

    switch (booking.status) {
      case 'completed':
        badgeType = BadgeType.completed;
        badgeKey = 'step_completed';
        break;
      case 'accepted':
        badgeType = BadgeType.active;
        badgeKey = 'tab_active';
        break;
      case 'cancelled':
        badgeType = BadgeType.cancelled;
        badgeKey = 'cancelled';
        break;
      default:
        badgeType = BadgeType.upcoming;
        badgeKey = 'tab_upcoming';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceWhite,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        boxShadow: AppTheme.cardShadow,
        border: Border.all(color: AppTheme.borderLight.withOpacity(0.7)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Emergency Badge if emergency booking
                if (booking.isEmergency) ...[
                  Container(
                    margin: const EdgeInsets.only(bottom: 10),
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

                // Header: Worker Avatar, Name, Trade & Status Badge
                Row(
                  children: [
                    Stack(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: booking.isEmergency ? const Color(0xFFFFF3E0) : AppTheme.lightBlueBg,
                            border: Border.all(
                              color: booking.isEmergency
                                  ? const Color(0xFFFFB74D)
                                  : AppTheme.primaryBlue.withOpacity(0.1),
                            ),
                          ),
                          child: Center(
                            child: Text(
                              booking.workerName?.isNotEmpty == true ? booking.workerName![0].toUpperCase() : 'W',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: booking.isEmergency ? const Color(0xFFE65100) : AppTheme.primaryBlue,
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppTheme.verifiedGreen,
                              border: Border.all(color: Colors.white, width: 1.5),
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
                            booking.workerName ?? l10n.tr('cooperative_partner'),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            l10n.tr(booking.skillCategory.toLowerCase()).toUpperCase(),
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppTheme.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    StatusBadge(label: l10n.tr(badgeKey), type: badgeType, localizationKey: badgeKey),
                  ],
                ),

                const SizedBox(height: 14),
                const Divider(height: 1, color: AppTheme.dividerColor),
                const SizedBox(height: 14),

                // Date & Time
                Row(
                  children: [
                    Icon(
                      booking.isEmergency ? Icons.bolt_rounded : Icons.calendar_today_outlined,
                      size: 15,
                      color: booking.isEmergency ? const Color(0xFFE65100) : AppTheme.textMuted,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        booking.isEmergency || booking.scheduledTime == 'immediate'
                            ? l10n.tr('immediate_dispatch_asap')
                            : (booking.scheduledTime.isNotEmpty ? booking.scheduledTime : l10n.tr('step_done')),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: booking.isEmergency ? FontWeight.w700 : FontWeight.w500,
                          color: booking.isEmergency ? const Color(0xFFE65100) : AppTheme.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Location
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 15, color: AppTheme.textMuted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        booking.serviceAddress,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: AppTheme.textSecondary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 14),
                // Dashed separator
                Container(height: 1, color: const Color(0xFFE2E8F0)),
                const SizedBox(height: 14),

                // Footer: Booking ID & Total Paid / Amount in INR
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.tr('booking_id_label'),
                          style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                        ),
                        Text(
                          '#${booking.shortCode ?? booking.id.substring(0, 8).toUpperCase()}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          booking.isCompleted ? l10n.tr('total_paid') : l10n.tr('est_total'),
                          style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                        ),
                        Text(
                          CurrencyFormatter.formatWithDecimals(booking.totalAmount),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

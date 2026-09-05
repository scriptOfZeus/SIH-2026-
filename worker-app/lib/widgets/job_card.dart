import 'package:flutter/material.dart';
import '../config/currency.dart';
import '../config/theme.dart';
import '../l10n/worker_localizations.dart';
import '../models/worker_booking_model.dart';
import 'status_badge.dart';

class JobCard extends StatelessWidget {
  final WorkerBooking booking;
  final VoidCallback? onAccept;
  final VoidCallback? onDecline;
  final VoidCallback? onTap;
  final bool showActions;

  const JobCard({
    super.key,
    required this.booking,
    this.onAccept,
    this.onDecline,
    this.onTap,
    this.showActions = true,
  });

  @override
  Widget build(BuildContext context) {
    final isEmerg = booking.isEmergency;
    final l10n = WorkerLocalizations.of(context);
    final tradeName = l10n.tr(booking.skillCategory.toLowerCase());
    final title = isEmerg
        ? '${l10n.tr('emergency')} $tradeName'
        : '$tradeName ${l10n.tr('service_suffix')}';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        border: Border.all(
          color: isEmerg ? AppTheme.emergencyBorder : AppTheme.borderLight,
          width: isEmerg ? 1.5 : 1,
        ),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header Row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isEmerg) ...[
                      const Icon(Icons.bolt, color: AppTheme.emergencyOrange, size: 20),
                      const SizedBox(width: 6),
                    ],
                    Expanded(
                      child: Text(
                        title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isEmerg ? AppTheme.textDark : AppTheme.textPrimary,
                        ),
                      ),
                    ),
                    Text(
                      CurrencyFormatter.format(booking.totalAmount),
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: isEmerg ? AppTheme.accentBlue : AppTheme.primaryBlue,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Customer & Distance Info
                Row(
                  children: [
                    const Icon(Icons.person_outline, size: 16, color: AppTheme.textSecondary),
                    const SizedBox(width: 6),
                    Text(
                      booking.customerName.isNotEmpty ? booking.customerName : l10n.tr('customer'),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const Text(' • ', style: TextStyle(color: AppTheme.textMuted)),
                    const Icon(Icons.location_on_outlined, size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 2),
                    Text(
                      l10n.tr('km_away', params: {'distance': booking.distanceKm.toStringAsFixed(1)}),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Time / Expiry Row
                Row(
                  children: [
                    const Icon(Icons.access_time, size: 16, color: AppTheme.textSecondary),
                    const SizedBox(width: 6),
                    Text(
                      isEmerg
                          ? l10n.tr('immediate_asap')
                          : (booking.scheduledTime.isNotEmpty ? booking.scheduledTime : l10n.tr('immediate_asap')),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: isEmerg ? FontWeight.w700 : FontWeight.w500,
                        color: isEmerg ? AppTheme.emergencyOrange : AppTheme.textSecondary,
                      ),
                    ),
                    const Spacer(),
                    if (isEmerg && booking.isPending)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.emergencyLightBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          l10n.tr('expires_in_60s'),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.emergencyOrange,
                          ),
                        ),
                      )
                    else
                      StatusBadge.status(booking.status),
                  ],
                ),

                // Action Buttons Row if Pending
                if (showActions && booking.isPending) ...[
                  const SizedBox(height: 14),
                  const Divider(color: AppTheme.dividerColor, height: 1),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: onDecline,
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppTheme.borderLight, width: 1.5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 11),
                          ),
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
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: onAccept,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isEmerg ? AppTheme.primaryBlue : AppTheme.primaryBlue,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 11),
                          ),
                          child: Text(
                            l10n.tr('accept_job'),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

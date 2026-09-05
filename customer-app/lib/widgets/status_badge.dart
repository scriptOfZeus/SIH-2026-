import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../l10n/app_localizations.dart';

enum BadgeType { verified, upcoming, active, completed, cancelled, rating }

class StatusBadge extends StatelessWidget {
  final String label;
  final BadgeType type;
  final String? localizationKey;

  const StatusBadge({
    super.key,
    required this.label,
    this.type = BadgeType.verified,
    this.localizationKey,
  });

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color textColor;
    IconData? icon;

    switch (type) {
      case BadgeType.verified:
        bgColor = const Color(0xFFD1FAE5);
        textColor = const Color(0xFF047857);
        icon = Icons.verified_user_rounded;
        break;
      case BadgeType.upcoming:
        bgColor = const Color(0xFFE0EDFF);
        textColor = const Color(0xFF1D4ED8);
        icon = Icons.schedule_rounded;
        break;
      case BadgeType.active:
        bgColor = const Color(0xFFFEF3C7);
        textColor = const Color(0xFFB45309);
        icon = Icons.directions_run_rounded;
        break;
      case BadgeType.completed:
        bgColor = const Color(0xFFD1FAE5);
        textColor = const Color(0xFF047857);
        icon = Icons.check_circle_rounded;
        break;
      case BadgeType.cancelled:
        bgColor = const Color(0xFFFFE4E4);
        textColor = const Color(0xFFDC2626);
        icon = Icons.cancel_rounded;
        break;
      case BadgeType.rating:
        bgColor = const Color(0xFFEFF6FF);
        textColor = const Color(0xFF1E40AF);
        icon = Icons.star_rounded;
        break;
    }

    final l10n = AppLocalizations.of(context);
    String displayLabel = label;
    if (localizationKey != null) {
      displayLabel = l10n.tr(localizationKey!);
    } else {
      final lower = label.trim().toLowerCase();
      if (lower == 'completed') {
        displayLabel = l10n.tr('step_completed');
      } else if (lower == 'in progress' || lower == 'active') {
        displayLabel = l10n.tr('tab_active');
      } else if (lower == 'upcoming' || lower == 'pending') {
        displayLabel = l10n.tr('tab_upcoming');
      } else if (lower == 'cancelled') {
        displayLabel = l10n.tr('cancelled');
      } else if (lower == 'verified' || lower == 'verified_partner' || lower == 'verified partner') {
        displayLabel = l10n.tr('verified_partner');
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: textColor),
          const SizedBox(width: 4),
          Text(
            displayLabel.toUpperCase(),
            style: TextStyle(
              color: textColor,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

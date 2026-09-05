import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../l10n/worker_localizations.dart';

class StatusBadge extends StatelessWidget {
  final String text;
  final String? localizationKey;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final Color? borderColor;

  const StatusBadge({
    super.key,
    required this.text,
    this.localizationKey,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.borderColor,
  });

  factory StatusBadge.emergency({String text = 'EMERGENCY SERVICE'}) {
    return StatusBadge(
      text: text,
      localizationKey: 'emergency_service_badge',
      icon: Icons.bolt,
      backgroundColor: AppTheme.emergencyLightBg,
      textColor: AppTheme.emergencyOrange,
      borderColor: AppTheme.emergencyBorder,
    );
  }

  factory StatusBadge.verified({String text = 'Verified Partner'}) {
    return StatusBadge(
      text: text,
      localizationKey: 'verified_partner',
      icon: Icons.check_circle,
      backgroundColor: AppTheme.verifiedLightBg,
      textColor: AppTheme.verifiedGreen,
      borderColor: AppTheme.verifiedGreen.withValues(alpha: 0.3),
    );
  }

  factory StatusBadge.status(String status) {
    switch (status.toLowerCase()) {
      case 'requested':
      case 'pending':
        return const StatusBadge(
          text: 'PENDING',
          localizationKey: 'pending_status_badge',
          icon: Icons.schedule,
          backgroundColor: Color(0xFFFFF8E1),
          textColor: Color(0xFFF57F17),
          borderColor: Color(0xFFFFE082),
        );
      case 'accepted':
      case 'on_the_way':
      case 'arriving':
        return const StatusBadge(
          text: 'ACTIVE',
          localizationKey: 'active_status_badge',
          icon: Icons.navigation,
          backgroundColor: Color(0xFFE3F2FD),
          textColor: AppTheme.primaryBlue,
          borderColor: Color(0xFF90CAF9),
        );
      case 'completed':
        return const StatusBadge(
          text: 'COMPLETED',
          localizationKey: 'completed_status_badge',
          icon: Icons.check_circle_outline,
          backgroundColor: AppTheme.verifiedLightBg,
          textColor: AppTheme.verifiedGreen,
          borderColor: Color(0xFFA5D6A7),
        );
      case 'cancelled':
        return const StatusBadge(
          text: 'CANCELLED',
          localizationKey: 'cancelled_status_badge',
          icon: Icons.cancel_outlined,
          backgroundColor: AppTheme.dangerLightBg,
          textColor: AppTheme.dangerRed,
          borderColor: Color(0xFFEF9A9A),
        );
      default:
        return StatusBadge(
          text: status.toUpperCase(),
          backgroundColor: const Color(0xFFF1F5F9),
          textColor: AppTheme.textSecondary,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bg = backgroundColor ?? const Color(0xFFF1F5F9);
    final fg = textColor ?? AppTheme.textPrimary;
    final l10n = WorkerLocalizations.of(context);
    final displayText = localizationKey != null ? l10n.tr(localizationKey!) : text;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: borderColor ?? Colors.transparent,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: fg),
            const SizedBox(width: 4),
          ],
          Text(
            displayText,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: fg,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

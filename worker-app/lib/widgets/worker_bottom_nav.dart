import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../l10n/worker_localizations.dart';

class WorkerBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final int alertCount;

  const WorkerBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.alertCount = 1,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = WorkerLocalizations.of(context);

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: AppTheme.borderLight, width: 1),
        ),
      ),
      padding: EdgeInsets.only(
        top: 8,
        bottom: MediaQuery.of(context).padding.bottom > 0 ? MediaQuery.of(context).padding.bottom : 8,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(
            index: 0,
            icon: Icons.home_filled,
            label: l10n.tr('home'),
          ),
          _buildNavItem(
            index: 1,
            icon: Icons.work_outline,
            activeIcon: Icons.work,
            label: l10n.tr('jobs'),
          ),
          _buildNavItem(
            index: 2,
            icon: Icons.account_balance_wallet_outlined,
            activeIcon: Icons.account_balance_wallet,
            label: l10n.tr('earnings'),
          ),
          _buildNavItem(
            index: 3,
            icon: Icons.notifications_none,
            activeIcon: Icons.notifications,
            label: l10n.tr('alerts'),
            hasBadge: alertCount > 0,
          ),
          _buildNavItem(
            index: 4,
            icon: Icons.person_outline,
            activeIcon: Icons.person,
            label: l10n.tr('profile'),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    IconData? activeIcon,
    required String label,
    bool hasBadge = false,
  }) {
    final isSelected = currentIndex == index;

    return InkWell(
      onTap: () => onTap(index),
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE2EDF9) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  isSelected ? (activeIcon ?? icon) : icon,
                  size: 22,
                  color: isSelected ? AppTheme.primaryBlue : AppTheme.textSecondary,
                ),
                if (hasBadge)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppTheme.dangerRed,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? AppTheme.primaryBlue : AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../../config/currency.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/worker_model.dart';
import '../../widgets/app_button.dart';
import '../../widgets/status_badge.dart';
import '../booking/create_booking_screen.dart';

class WorkerProfileScreen extends StatelessWidget {
  final WorkerModel worker;

  const WorkerProfileScreen({super.key, required this.worker});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(l10n.tr('worker_profile_title')),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert_rounded),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                ),
                builder: (ctx) => SafeArea(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ListTile(
                        leading: const Icon(Icons.share_outlined, color: AppTheme.primaryBlue),
                        title: Text(l10n.tr('share_profile')),
                        onTap: () {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('${l10n.tr('share_profile')}: ${worker.fullName}...')),
                          );
                        },
                      ),
                      ListTile(
                        leading: const Icon(Icons.flag_outlined, color: AppTheme.dangerRed),
                        title: Text(l10n.tr('report_profile')),
                        onTap: () {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(l10n.tr('report_profile_desc'))),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
        child: Column(
          children: [
            // Center Profile Avatar with Verified Badge
            Center(
              child: Stack(
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.lightBlueBg,
                      border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.15), width: 2),
                    ),
                    child: Center(
                      child: Text(
                        worker.fullName.isNotEmpty ? worker.fullName[0].toUpperCase() : 'W',
                        style: const TextStyle(
                          fontSize: 40,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.primaryBlue,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 4,
                    bottom: 4,
                    child: Container(
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                        color: AppTheme.verifiedGreen,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2.5),
                      ),
                      child: const Icon(Icons.check, size: 16, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Worker Name & Trade
            Text(
              worker.fullName,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (worker.isVerified) ...[
                  StatusBadge(label: l10n.tr('badge_verified'), type: BadgeType.verified),
                  const SizedBox(width: 8),
                ],
                Text(
                  '${l10n.tr(worker.skillCategory.toLowerCase()).toUpperCase()} ${l10n.tr('cooperative_partner').toUpperCase()}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // 3 Stat Boxes matching Figma
            Row(
              children: [
                Expanded(
                  child: _StatBox(
                    icon: Icons.star_rounded,
                    iconColor: AppTheme.ratingYellow,
                    value: worker.avgRating.toStringAsFixed(1),
                    label: l10n.tr('stat_rating'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatBox(
                    icon: Icons.reviews_outlined,
                    iconColor: AppTheme.primaryBlue,
                    value: '${worker.totalJobs}',
                    label: l10n.tr('reviews'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatBox(
                    icon: Icons.location_on_outlined,
                    iconColor: AppTheme.primaryBlue,
                    value: '${worker.distanceKm?.toStringAsFixed(1) ?? "2.4"} km',
                    label: l10n.tr('distance'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // About Card matching Figma
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
                    children: [
                      const Icon(Icons.info_outline_rounded, size: 20, color: AppTheme.primaryBlue),
                      const SizedBox(width: 8),
                      Text(
                        l10n.tr('about_worker'),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    (worker.bio != null &&
                            worker.bio!.trim().isNotEmpty &&
                            !worker.bio!.startsWith('Certified cooperative professional') &&
                            !worker.bio!.startsWith('Licensed and NSDC certified'))
                        ? worker.bio!
                        : l10n.tr('default_bio_full'),
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.textSecondary,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Recent Reviews Card matching Figma
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
                      Row(
                        children: [
                          const Icon(Icons.rate_review_outlined, size: 20, color: AppTheme.primaryBlue),
                          const SizedBox(width: 8),
                          Text(
                            l10n.tr('recent_reviews'),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      TextButton(
                        onPressed: () {
                          showModalBottomSheet(
                            context: context,
                            shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                            ),
                            builder: (ctx) => Padding(
                              padding: const EdgeInsets.all(20.0),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '${l10n.tr('reviews')} (${worker.totalJobs})',
                                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.close_rounded),
                                        onPressed: () => Navigator.pop(ctx),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  _buildReviewTile(
                                    name: 'Pooja Sharma',
                                    date: l10n.tr('review_time_2_days_ago'),
                                    rating: 5.0,
                                    comment: l10n.tr('sample_review_1'),
                                  ),
                                  const SizedBox(height: 12),
                                  _buildReviewTile(
                                    name: 'Rajesh Mukherjee',
                                    date: l10n.tr('review_time_1_week_ago'),
                                    rating: 4.8,
                                    comment: l10n.tr('sample_review_2'),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        child: Text(
                          l10n.tr('see_all'),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.primaryBlue),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Review Item
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: const BoxDecoration(
                                color: Color(0xFFDCE8FC),
                                shape: BoxShape.circle,
                              ),
                              child: const Center(
                                child: Text('S', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Pooja Sharma',
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                                  ),
                                  Text(
                                    l10n.tr('review_time_2_days_ago'),
                                    style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                  ),
                                ],
                              ),
                            ),
                            const Row(
                              children: [
                                Icon(Icons.star_rounded, size: 16, color: AppTheme.ratingYellow),
                                Icon(Icons.star_rounded, size: 16, color: AppTheme.ratingYellow),
                                Icon(Icons.star_rounded, size: 16, color: AppTheme.ratingYellow),
                                Icon(Icons.star_rounded, size: 16, color: AppTheme.ratingYellow),
                                Icon(Icons.star_rounded, size: 16, color: AppTheme.ratingYellow),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l10n.tr('sample_review_1'),
                          style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.35),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 100), // Spacing for bottom bar
          ],
        ),
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        decoration: BoxDecoration(
          color: AppTheme.surfaceWhite,
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withOpacity(0.08),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.tr('starting_from'),
                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  ),
                  Text(
                    CurrencyFormatter.formatRate(worker.hourlyRate),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 20),
              Expanded(
                child: AppButton(
                  label: l10n.tr('book_this_worker'),
                  icon: Icons.calendar_month_rounded,
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => CreateBookingScreen(worker: worker),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _buildReviewTile({
    required String name,
    required String date,
    required double rating,
    required String comment,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: AppTheme.lightBlueBg,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    name.isNotEmpty ? name[0] : 'U',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue, fontSize: 13),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary)),
                    Text(date, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                  ],
                ),
              ),
              Row(
                children: List.generate(
                  5,
                  (i) => Icon(
                    Icons.star_rounded,
                    size: 14,
                    color: i < rating.floor() ? AppTheme.ratingYellow : AppTheme.borderLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(comment, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String value;
  final String label;

  const _StatBox({
    required this.icon,
    required this.iconColor,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceWhite,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        boxShadow: AppTheme.cardShadow,
        border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: iconColor),
              const SizedBox(width: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppTheme.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

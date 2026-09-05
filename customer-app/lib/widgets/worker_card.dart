import 'package:flutter/material.dart';
import '../config/currency.dart';
import '../config/theme.dart';
import '../l10n/app_localizations.dart';
import '../models/worker_model.dart';
import 'status_badge.dart';

class WorkerCard extends StatelessWidget {
  final WorkerModel worker;
  final VoidCallback onTap;
  final VoidCallback? onBookNow;
  final bool showRateAndButton;

  const WorkerCard({
    super.key,
    required this.worker,
    required this.onTap,
    this.onBookNow,
    this.showRateAndButton = false,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceWhite,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        boxShadow: AppTheme.cardShadow,
        border: Border.all(color: AppTheme.borderLight.withOpacity(0.6)),
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
                Row(
                  children: [
                    // Avatar with online status dot
                    Stack(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.lightBlueBg,
                            border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.1), width: 1.5),
                          ),
                          child: Center(
                            child: Text(
                              worker.fullName.isNotEmpty ? worker.fullName[0].toUpperCase() : 'W',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.primaryBlue,
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppTheme.verifiedGreen,
                              border: Border.all(color: Colors.white, width: 2),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 14),

                    // Name, Trade & Rating
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  worker.fullName,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.textPrimary,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              if (worker.isVerified)
                                const StatusBadge(label: 'VERIFIED', type: BadgeType.verified),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            l10n.tr(worker.skillCategory.toLowerCase()).toUpperCase(),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded, size: 16, color: AppTheme.ratingYellow),
                              const SizedBox(width: 3),
                              Text(
                                '${worker.avgRating.toStringAsFixed(1)} (${worker.totalJobs})',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              if (worker.distanceKm != null) ...[
                                const Text(' • ', style: TextStyle(color: AppTheme.textMuted)),
                                const Icon(Icons.near_me_rounded, size: 13, color: AppTheme.textMuted),
                                const SizedBox(width: 2),
                                Text(
                                  '${worker.distanceKm!.toStringAsFixed(1)} km',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),

                    if (!showRateAndButton)
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTheme.borderLight),
                        ),
                        child: const Icon(Icons.arrow_forward_rounded, size: 18, color: AppTheme.primaryBlue),
                      ),
                  ],
                ),

                if (showRateAndButton) ...[
                  const SizedBox(height: 14),
                  // Highlight quote box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.verified_outlined, size: 14, color: AppTheme.primaryBlue),
                            const SizedBox(width: 4),
                            Text(
                              l10n.tr('highly_rated'),
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primaryBlue,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          (worker.bio != null &&
                                  worker.bio!.trim().isNotEmpty &&
                                  !worker.bio!.startsWith('Certified cooperative professional') &&
                                  !worker.bio!.startsWith('Licensed and NSDC certified'))
                              ? worker.bio!
                              : l10n.tr('default_bio'),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                            height: 1.3,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Price & Book Now button row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        CurrencyFormatter.formatRate(worker.hourlyRate),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      ElevatedButton(
                        onPressed: onBookNow ?? onTap,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryBlue,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        ),
                        child: Text(
                          l10n.tr('book_now'),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
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

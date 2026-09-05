import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/currency.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../models/earnings_model.dart';
import '../../providers/worker_earnings_provider.dart';
import '../../widgets/app_button.dart';
import '../jobs/job_history_screen.dart';

class WorkerEarningsScreen extends StatelessWidget {
  const WorkerEarningsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final earningsProvider = Provider.of<WorkerEarningsProvider>(context);
    final summary = earningsProvider.summary;
    final period = earningsProvider.selectedPeriod;
    final l10n = WorkerLocalizations.of(context);

    String getPeriodLabel(String p) {
      switch (p) {
        case 'Today':
          return l10n.tr('today');
        case 'Week':
          return l10n.tr('week');
        case 'Month':
          return l10n.tr('month');
        default:
          return p;
      }
    }

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        title: Text(l10n.tr('earnings')),
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Period Toggle Selector (Today / Week / Month)
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFEDF2F7),
                borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
              ),
              child: Row(
                children: ['Today', 'Week', 'Month'].map((p) {
                  final isSelected = p == period;
                  return Expanded(
                    child: InkWell(
                      onTap: () => earningsProvider.setPeriod(p),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.05),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : [],
                        ),
                        child: Center(
                          child: Text(
                            getPeriodLabel(p),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              color: isSelected ? AppTheme.primaryBlue : AppTheme.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Earnings Summary & Bar Chart Card
            Container(
              padding: const EdgeInsets.all(20),
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
                    '${period.toUpperCase()} EARNINGS',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textSecondary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 6),

                  Text(
                    CurrencyFormatter.format(earningsProvider.currentPeriodEarnings),
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.primaryDark,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),

                  Row(
                    children: [
                      const Icon(Icons.trending_up, size: 16, color: AppTheme.verifiedGreen),
                      const SizedBox(width: 4),
                      Text(
                        '+${summary.growthPercentage.toInt()}% from last $period',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.verifiedGreen,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Weekly Bar Chart
                  _buildWeeklyChart(summary.weeklyChartData),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Welfare Fund Auto-Contribution Card
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF1B5E20),
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1B5E20).withValues(alpha: 0.2),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.security, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.tr('welfare_fund'),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const Text(
                          'Auto-contribution to health & safety',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    CurrencyFormatter.format(summary.welfareContribution),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Withdraw to Bank Action Button
            AppButton(
              text: l10n.tr('withdraw_bank'),
              icon: Icons.account_balance,
              type: ButtonType.primary,
              onPressed: () async {
                final ok = await earningsProvider.withdrawToBank();
                if (ok && context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Withdrawal initiated to your verified cooperative bank account.'),
                      backgroundColor: AppTheme.verifiedGreen,
                    ),
                  );
                }
              },
            ),
            const SizedBox(height: 24),

            // Recent Jobs Section
            Text(
              l10n.tr('recent_jobs'),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppTheme.textDark,
              ),
            ),
            const SizedBox(height: 12),

            ...summary.recentJobs.map((job) => _buildRecentJobItem(job)),

            const SizedBox(height: 12),

            Center(
              child: TextButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const JobHistoryScreen()),
                  );
                },
                child: Text(
                  l10n.tr('see_all'),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primaryBlue,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildWeeklyChart(Map<String, double> data) {
    const maxVal = 2000.0;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: data.entries.map((entry) {
        final day = entry.key;
        final val = entry.value;
        final isHighlighted = day == 'Thu';
        final heightFactor = (val / maxVal).clamp(0.15, 1.0);

        return Column(
          children: [
            if (isHighlighted)
              Text(
                '₹${val.toInt()}',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.primaryBlue,
                ),
              )
            else
              const SizedBox(height: 14),
            const SizedBox(height: 4),

            Container(
              width: 32,
              height: 100 * heightFactor,
              decoration: BoxDecoration(
                color: isHighlighted ? AppTheme.primaryBlue : const Color(0xFFD6E4F0),
                borderRadius: BorderRadius.circular(6),
              ),
            ),
            const SizedBox(height: 8),

            Text(
              day,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isHighlighted ? FontWeight.w800 : FontWeight.w500,
                color: isHighlighted ? AppTheme.primaryBlue : AppTheme.textSecondary,
              ),
            ),
          ],
        );
      }).toList(),
    );
  }

  Widget _buildRecentJobItem(EarningsJobItem job) {
    IconData icon;
    switch (job.iconType) {
      case 'delivery':
        icon = Icons.local_shipping_outlined;
        break;
      case 'cleaning':
        icon = Icons.cleaning_services_outlined;
        break;
      case 'plumbing':
        icon = Icons.plumbing_outlined;
        break;
      case 'ac':
        icon = Icons.ac_unit_outlined;
        break;
      case 'electrician':
      default:
        icon = Icons.electrical_services_outlined;
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFE3F2FD),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: AppTheme.primaryBlue, size: 20),
          ),
          const SizedBox(width: 12),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  job.title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textDark,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${job.area} • ${job.time}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),

          Text(
            CurrencyFormatter.format(job.amount),
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppTheme.textDark,
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../providers/worker_auth_provider.dart';
import '../../providers/worker_profile_provider.dart';
import '../../services/worker_service.dart';
import '../../widgets/app_button.dart';
import '../auth/worker_login_screen.dart';
import '../home/worker_main_screen.dart';

class WorkerPendingVerificationScreen extends StatefulWidget {
  final Map<String, dynamic>? ocrResult;
  final String? workerName;
  final String? skillCategory;

  const WorkerPendingVerificationScreen({
    super.key,
    this.ocrResult,
    this.workerName,
    this.skillCategory,
  });

  @override
  State<WorkerPendingVerificationScreen> createState() => _WorkerPendingVerificationScreenState();
}

class _WorkerPendingVerificationScreenState extends State<WorkerPendingVerificationScreen> {
  bool _isChecking = false;

  Future<void> _checkStatus() async {
    setState(() => _isChecking = true);
    try {
      final profile = await WorkerService.getProfile();
      if (!mounted) return;

      if (profile != null && profile.isApproved) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🎉 Congratulations! Your application has been approved by Supervising Admin.'),
            backgroundColor: AppTheme.verifiedGreen,
          ),
        );
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const WorkerMainScreen()),
          (route) => false,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Verification in progress: Awaiting Supervising Admin Adjudication.'),
            backgroundColor: AppTheme.primaryBlue,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error checking status: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isChecking = false);
    }
  }

  void _handleLogout() async {
    final auth = Provider.of<WorkerAuthProvider>(context, listen: false);
    await auth.logout();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const WorkerLoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileProvider = Provider.of<WorkerProfileProvider>(context);
    final l10n = WorkerLocalizations.of(context);
    final name = widget.workerName ?? profileProvider.workerName;
    final skill = widget.skillCategory ?? profileProvider.tradeSkill;
    final ocrStatus = widget.ocrResult?['ocr_status']?.toString().toUpperCase() ?? 'MATCHED';

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 12),

              // Shield Icon with pending status
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                  border: Border.all(color: AppTheme.primaryBlue.withValues(alpha: 0.3), width: 2),
                ),
                child: const Center(
                  child: Icon(Icons.verified_user_outlined, size: 40, color: AppTheme.primaryBlue),
                ),
              ),
              const SizedBox(height: 20),

              // Title & Subtitle
              Text(
                l10n.tr('application_submitted'),
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.textDark,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.tr('application_submitted_desc'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 28),

              // Worker Summary Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                  border: Border.all(color: AppTheme.borderLight),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textDark),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              skill.toUpperCase(),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primaryBlue),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3E8FF),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            'INDEPENDENT',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF7E22CE)),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),

                    // Stage 1: Automated OCR Analysis
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.auto_awesome, size: 16, color: Color(0xFF6366F1)),
                            const SizedBox(width: 6),
                            Text(l10n.tr('automated_ocr_analysis'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            ocrStatus,
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF15803D)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Stage 2: Final Human Adjudication
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.admin_panel_settings, size: 16, color: AppTheme.primaryBlue),
                            const SizedBox(width: 6),
                            Text(l10n.tr('final_verification'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            l10n.tr('pending_review'),
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFB45309)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Informational Quality Standards Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline, size: 18, color: AppTheme.primaryBlue),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        l10n.tr('verification_info_box'),
                        style: const TextStyle(fontSize: 12, color: Color(0xFF1E40AF), height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 36),

              // Action Buttons
              AppButton(
                text: _isChecking ? l10n.tr('checking_status') : l10n.tr('check_approval_status'),
                type: ButtonType.primary,
                onPressed: _isChecking ? () {} : _checkStatus,
              ),
              const SizedBox(height: 12),

              OutlinedButton(
                onPressed: _handleLogout,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
                  side: const BorderSide(color: AppTheme.borderLight),
                ),
                child: Text(l10n.tr('back_to_login_btn'), style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../providers/worker_auth_provider.dart';
import '../../providers/worker_language_provider.dart';
import '../../providers/worker_profile_provider.dart';
import '../../services/worker_alert_tts_service.dart';
import '../auth/worker_login_screen.dart';
import '../language/worker_language_select_screen.dart';

class WorkerSettingsScreen extends StatefulWidget {
  const WorkerSettingsScreen({super.key});

  @override
  State<WorkerSettingsScreen> createState() => _WorkerSettingsScreenState();
}

class _WorkerSettingsScreenState extends State<WorkerSettingsScreen> {
  bool _emergencyAlerts = true;
  bool _alertVoiceEnabled = true;

  @override
  void initState() {
    super.initState();
    _alertVoiceEnabled = WorkerAlertTtsService.isEnabled;
  }

  void _showLogoutDialog() {
    final l10n = WorkerLocalizations.of(context);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.tr('confirm_logout')),
        content: Text(l10n.tr('confirm_logout')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(l10n.tr('cancel')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.dangerRed),
            onPressed: () async {
              Navigator.of(ctx).pop();
              final auth = Provider.of<WorkerAuthProvider>(context, listen: false);
              await auth.logout();
              if (mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const WorkerLoginScreen()),
                  (route) => false,
                );
              }
            },
            child: Text(l10n.tr('logout'), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profileProvider = Provider.of<WorkerProfileProvider>(context);
    final langProvider = Provider.of<WorkerLanguageProvider>(context);
    final l10n = WorkerLocalizations.of(context);

    final currentLangModel = langProvider.currentLanguageModel;
    final langDisplay = '${currentLangModel.nativeName} (${currentLangModel.englishName})';

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        title: Text(l10n.tr('settings')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Operational Preferences
            _buildSectionHeader(l10n.tr('operational_preferences')),
            Card(
              margin: EdgeInsets.zero,
              elevation: 0,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                side: const BorderSide(color: AppTheme.borderLight),
              ),
              child: Column(
                children: [
                  SwitchListTile(
                    title: Text(l10n.tr('accept_emergency_req'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(l10n.tr('accept_emergency_sub')),
                    value: _emergencyAlerts,
                    activeThumbColor: Colors.white,
                    activeTrackColor: AppTheme.emergencyOrange,
                    onChanged: (val) => setState(() => _emergencyAlerts = val),
                  ),
                  const Divider(height: 1),
                  SwitchListTile(
                    title: Text(l10n.tr('toggle_availability'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(l10n.tr('accept_jobs_notice')),
                    value: profileProvider.isAvailable,
                    activeThumbColor: Colors.white,
                    activeTrackColor: AppTheme.primaryBlue,
                    onChanged: (val) => profileProvider.toggleAvailability(val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // App Settings
            _buildSectionHeader(l10n.tr('preferences_section')),
            Card(
              margin: EdgeInsets.zero,
              elevation: 0,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                side: const BorderSide(color: AppTheme.borderLight),
              ),
              child: Column(
                children: [
                  // Language Selector Row
                  ListTile(
                    leading: const Icon(Icons.translate_rounded, color: AppTheme.primaryBlue),
                    title: Text(l10n.tr('language'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          langDisplay,
                          style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.primaryBlue, fontSize: 13),
                        ),
                        const Icon(Icons.chevron_right, color: AppTheme.textSecondary),
                      ],
                    ),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const WorkerLanguageSelectScreen(isFromSettings: true),
                        ),
                      );
                    },
                  ),
                  const Divider(height: 1),

                  // Alert Voice Toggle Row
                  SwitchListTile(
                    secondary: const Icon(Icons.record_voice_over_rounded, color: AppTheme.primaryBlue),
                    title: Text(l10n.tr('alert_voice'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(
                      _alertVoiceEnabled ? l10n.tr('voice_on') : l10n.tr('voice_off'),
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: _alertVoiceEnabled ? AppTheme.verifiedGreen : AppTheme.textMuted,
                      ),
                    ),
                    value: _alertVoiceEnabled,
                    activeThumbColor: Colors.white,
                    activeTrackColor: AppTheme.primaryBlue,
                    onChanged: (val) async {
                      setState(() => _alertVoiceEnabled = val);
                      await WorkerAlertTtsService.setEnabled(val);
                      if (val) {
                        await WorkerAlertTtsService.warmUpUserGesture();
                      }
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Cooperative Support & Policies
            _buildSectionHeader(l10n.tr('support_legal')),
            Card(
              margin: EdgeInsets.zero,
              elevation: 0,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                side: const BorderSide(color: AppTheme.borderLight),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.support_agent, color: AppTheme.primaryBlue),
                    title: Text(l10n.tr('help_support_title'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(l10n.tr('support_helpline')),
                    trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondary),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.tr('connecting_support'))),
                      );
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.security, color: AppTheme.verifiedGreen),
                    title: Text(l10n.tr('welfare_insurance_title'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondary),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.tr('welfare_policy_desc'))),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Logout Button
            OutlinedButton.icon(
              onPressed: _showLogoutDialog,
              icon: const Icon(Icons.logout, color: AppTheme.dangerRed, size: 18),
              label: Text(
                l10n.tr('logout'),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.dangerRed,
                ),
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 50),
                side: const BorderSide(color: AppTheme.dangerRed, width: 1.5),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: AppTheme.textSecondary,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

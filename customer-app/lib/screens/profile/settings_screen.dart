import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/customer_provider.dart';
import '../../providers/language_provider.dart';
import '../../services/alert_tts_service.dart';
import '../auth/phone_auth_screen.dart';
import '../language/language_select_screen.dart';
import 'profile_setup_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _alertVoiceEnabled = true;

  @override
  void initState() {
    super.initState();
    _alertVoiceEnabled = AlertTtsService.isEnabled;
  }

  @override
  Widget build(BuildContext context) {
    final customer = Provider.of<CustomerProvider>(context).profile;
    final authProvider = Provider.of<AuthProvider>(context);
    final langProvider = Provider.of<LanguageProvider>(context);
    final l10n = AppLocalizations.of(context);

    final name = customer?.fullName ?? 'Alex Chen';
    final phone = customer?.phone.isNotEmpty == true ? customer!.phone : '+91 98765 43210';
    final currentLangModel = langProvider.currentLanguageModel;
    final langDisplay = '${currentLangModel.nativeName} (${currentLangModel.englishName})';

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(l10n.tr('settings')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top User Info Header Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surfaceWhite,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                boxShadow: AppTheme.cardShadow,
                border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: const BoxDecoration(
                      color: AppTheme.lightBlueBg,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'C',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: AppTheme.primaryBlue),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                        ),
                        Text(
                          phone,
                          style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ACCOUNT SECTION
            _buildSectionHeader(l10n.tr('account_section')),
            _buildSettingsContainer([
              _buildSettingsRow(
                icon: Icons.person_outline_rounded,
                title: l10n.tr('edit_profile'),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ProfileSetupScreen()),
                  );
                },
              ),
              _buildDivider(),
              _buildSettingsRow(
                icon: Icons.phone_outlined,
                title: l10n.tr('phone_label'),
                trailingText: phone,
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(l10n.tr('phone_label'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      content: Text('Registered mobile number: $phone'),
                      actions: [
                        TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(l10n.tr('close'))),
                      ],
                    ),
                  );
                },
              ),
              _buildDivider(),
              _buildSettingsRow(
                icon: Icons.location_on_outlined,
                title: l10n.tr('address_details'),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(l10n.tr('address_details'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      content: Text(l10n.tr('pickup_address')),
                      actions: [
                        TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(l10n.tr('close'))),
                      ],
                    ),
                  );
                },
              ),
            ]),
            const SizedBox(height: 20),

            // PREFERENCES SECTION
            _buildSectionHeader(l10n.tr('preferences_section')),
            _buildSettingsContainer([
              // Language Selection Row
              _buildSettingsRow(
                icon: Icons.translate_rounded,
                title: l10n.tr('language'),
                trailingText: langDisplay,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const LanguageSelectScreen(isFromSettings: true),
                    ),
                  );
                },
              ),
              _buildDivider(),
              // Alert Voice Toggle Row
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(color: AppTheme.lightBlueBg, shape: BoxShape.circle),
                      child: const Icon(Icons.record_voice_over_rounded, size: 16, color: AppTheme.primaryBlue),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.tr('alert_voice'),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                          ),
                          Text(
                            _alertVoiceEnabled ? l10n.tr('voice_on') : l10n.tr('voice_off'),
                            style: TextStyle(
                              fontSize: 12,
                              color: _alertVoiceEnabled ? AppTheme.verifiedGreen : AppTheme.textMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _alertVoiceEnabled,
                      activeThumbColor: AppTheme.primaryBlue,
                      onChanged: (val) async {
                        setState(() => _alertVoiceEnabled = val);
                        await AlertTtsService.setEnabled(val);
                        if (val) {
                          await AlertTtsService.warmUpUserGesture();
                        }
                      },
                    ),
                  ],
                ),
              ),
            ]),
            const SizedBox(height: 20),

            // SUPPORT SECTION
            _buildSectionHeader(l10n.tr('support_section')),
            _buildSettingsContainer([
              _buildSettingsRow(
                icon: Icons.help_outline_rounded,
                title: l10n.tr('help_center'),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(l10n.tr('help_center'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      content: const Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Toll-Free Helpline: 1800-200-COOP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          SizedBox(height: 6),
                          Text('Support Email: support@sahkarsewa.in', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          SizedBox(height: 12),
                          Text('Support hours: 9:00 AM – 8:00 PM IST (Mon - Sat)', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                        ],
                      ),
                      actions: [
                        TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(l10n.tr('close'))),
                      ],
                    ),
                  );
                },
              ),
              _buildDivider(),
              _buildSettingsRow(
                icon: Icons.chat_bubble_outline_rounded,
                title: l10n.tr('contact_us'),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(l10n.tr('contact_us'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      content: const Text(
                        'Sahkar Sewa Support Desk: support@sahkarsewa.in',
                        style: TextStyle(fontSize: 13),
                      ),
                      actions: [
                        TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(l10n.tr('close'))),
                      ],
                    ),
                  );
                },
              ),
            ]),
            const SizedBox(height: 20),

            // LEGAL SECTION
            _buildSectionHeader(l10n.tr('legal_section')),
            _buildSettingsContainer([
              _buildSettingsRow(
                icon: Icons.description_outlined,
                title: l10n.tr('terms_of_service'),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(l10n.tr('terms_of_service'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      content: const Text(
                        'Sahkar Sewa Platform provides a transparent, fair-welfare gig service network adhering to NSDC standards and fair worker compensation.',
                        style: TextStyle(fontSize: 12),
                      ),
                      actions: [
                        TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(l10n.tr('close'))),
                      ],
                    ),
                  );
                },
              ),
              _buildDivider(),
              _buildSettingsRow(
                icon: Icons.privacy_tip_outlined,
                title: l10n.tr('privacy_policy'),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(l10n.tr('privacy_policy'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      content: const Text(
                        'Your personal data, contact information, and location are protected under strict cooperative platform security standards.',
                        style: TextStyle(fontSize: 12),
                      ),
                      actions: [
                        TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(l10n.tr('close'))),
                      ],
                    ),
                  );
                },
              ),
            ]),
            const SizedBox(height: 24),

            // Log Out Action Button
            Container(
              decoration: BoxDecoration(
                color: AppTheme.dangerRedBg,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () async {
                    await authProvider.logout();
                    if (context.mounted) {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const PhoneAuthScreen()),
                        (route) => false,
                      );
                    }
                  },
                  borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.logout_rounded, color: AppTheme.dangerRed, size: 20),
                        const SizedBox(width: 10),
                        Text(
                          l10n.tr('logout'),
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.dangerRed,
                          ),
                        ),
                      ],
                    ),
                  ),
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
      padding: const EdgeInsets.only(left: 4.0, bottom: 8.0),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: AppTheme.textMuted,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildSettingsContainer(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceWhite,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        boxShadow: AppTheme.cardShadow,
        border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildSettingsRow({
    required IconData icon,
    required String title,
    String? trailingText,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(color: AppTheme.lightBlueBg, shape: BoxShape.circle),
                child: Icon(icon, size: 16, color: AppTheme.primaryBlue),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                ),
              ),
              if (trailingText != null) ...[
                Text(
                  trailingText,
                  style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
                ),
                const SizedBox(width: 6),
              ],
              const Icon(Icons.chevron_right_rounded, size: 18, color: AppTheme.textMuted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return const Divider(height: 1, color: AppTheme.dividerColor, indent: 60);
  }
}

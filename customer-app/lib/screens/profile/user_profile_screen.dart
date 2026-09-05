import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/customer_provider.dart';
import '../auth/phone_auth_screen.dart';
import '../booking/my_bookings_screen.dart';
import 'profile_setup_screen.dart';
import 'settings_screen.dart';

class UserProfileScreen extends StatelessWidget {
  const UserProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final customerProvider = Provider.of<CustomerProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final l10n = AppLocalizations.of(context);
    final profile = customerProvider.profile;

    final name = profile?.fullName ?? 'Alex Chen';
    final phone = profile?.phone.isNotEmpty == true ? profile!.phone : '+91 98765 43210';

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: AppTheme.textPrimary),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const SettingsScreen()),
            );
          },
        ),
        title: const Text('Sahkar Sewa'),
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
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.lightBlueBg,
                      border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.15), width: 2),
                    ),
                    child: Center(
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'C',
                        style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: AppTheme.primaryBlue),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 4,
                    bottom: 4,
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: AppTheme.verifiedGreen,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: const Icon(Icons.check, size: 14, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // User Full Name & Phone
            Text(
              name,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              phone,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 24),

            // Profile Action Cards List matching Figma
            _buildProfileNavCard(
              context: context,
              icon: Icons.person_outline_rounded,
              title: l10n.tr('edit_profile'),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfileSetupScreen()),
                );
              },
            ),
            const SizedBox(height: 12),
            _buildProfileNavCard(
              context: context,
              icon: Icons.calendar_today_outlined,
              title: l10n.tr('my_bookings'),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const MyBookingsScreen()),
                );
              },
            ),
            const SizedBox(height: 12),
            _buildProfileNavCard(
              context: context,
              icon: Icons.location_on_outlined,
              title: l10n.tr('saved_locations'),
              onTap: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Text(l10n.tr('saved_locations'), style: const TextStyle(fontWeight: FontWeight.bold)),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.tr('service_location_label'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textSecondary)),
                        const SizedBox(height: 6),
                        Text(profile?.defaultAddress ?? 'Park Street, Kolkata, WB 700016', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppTheme.lightBlueBg,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Multiple saved addresses and favorites will be available in V2. To update your primary address, use Edit Profile.',
                            style: TextStyle(fontSize: 12, color: AppTheme.primaryBlue),
                          ),
                        ),
                      ],
                    ),
                    actions: [
                      TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(l10n.tr('close'))),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 12),
            _buildProfileNavCard(
              context: context,
              icon: Icons.settings_outlined,
              title: l10n.tr('settings'),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                );
              },
            ),
            const SizedBox(height: 12),
            _buildProfileNavCard(
              context: context,
              icon: Icons.help_outline_rounded,
              title: l10n.tr('help_support'),
              onTap: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Text(l10n.tr('help_desk_title'), style: const TextStyle(fontWeight: FontWeight.bold)),
                    content: const Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Need assistance with your bookings or services?', style: TextStyle(fontSize: 13)),
                        SizedBox(height: 14),
                        Row(
                          children: [
                            Icon(Icons.phone_rounded, size: 18, color: AppTheme.primaryBlue),
                            SizedBox(width: 8),
                            Text('1800-200-COOP (Toll-Free)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                        SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.email_outlined, size: 18, color: AppTheme.primaryBlue),
                            SizedBox(width: 8),
                            Text('support@sahkarsewa.in', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                        SizedBox(height: 14),
                        Text(
                          'For issues on completed jobs, you can also view Dispute options in Booking Details.',
                          style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                    actions: [
                      TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(l10n.tr('close'))),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 20),

            // Logout Card matching Figma
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
                      children: [
                        const Icon(Icons.logout_rounded, color: AppTheme.dangerRed, size: 20),
                        const SizedBox(width: 14),
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

  Widget _buildProfileNavCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceWhite,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        boxShadow: AppTheme.cardShadow,
        border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: const BoxDecoration(
                    color: AppTheme.lightBlueBg,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 18, color: AppTheme.primaryBlue),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, size: 20, color: AppTheme.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

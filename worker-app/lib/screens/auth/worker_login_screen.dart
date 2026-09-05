import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../providers/worker_auth_provider.dart';
import '../../widgets/app_button.dart';
import 'worker_otp_screen.dart';

class WorkerLoginScreen extends StatefulWidget {
  const WorkerLoginScreen({super.key});

  @override
  State<WorkerLoginScreen> createState() => _WorkerLoginScreenState();
}

class _WorkerLoginScreenState extends State<WorkerLoginScreen> {
  final _phoneController = TextEditingController(text: '7000000099');
  String _countryCode = '+91';
  String _onboardingType = 'federation'; // 'federation' | 'independent'

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSendOtp() async {
    final l10n = WorkerLocalizations.of(context);
    final phone = _phoneController.text.trim();
    if (phone.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.tr('invalid_phone'))),
      );
      return;
    }

    final authProvider = Provider.of<WorkerAuthProvider>(context, listen: false);
    final fullPhone = '$_countryCode$phone';
    final role = _onboardingType == 'federation' ? 'worker' : 'independent_worker';

    final success = await authProvider.requestOtp(fullPhone, role: role);

    if (mounted) {
      if (success) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => WorkerOtpScreen(phoneNumber: fullPhone),
          ),
        );
      } else if (authProvider.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage!),
            backgroundColor: AppTheme.dangerRed,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<WorkerAuthProvider>(context);
    final l10n = WorkerLocalizations.of(context);

    return Scaffold(
      backgroundColor: AppTheme.lightBlueBg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Cooperative Logo Badge
                Container(
                  width: 80,
                  height: 80,
                  decoration: const BoxDecoration(
                    color: AppTheme.primaryBlue,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Color(0x220D47A1),
                        blurRadius: 16,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.handshake_outlined,
                    size: 40,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 18),

                // Platform Brand Header
                Text(
                  l10n.tr('app_title'),
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.primaryDark,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  l10n.tr('coop_gig_platform'),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primaryBlue,
                  ),
                ),
                const SizedBox(height: 24),

                // Onboarding Choice Selector
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _onboardingType = 'federation'),
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _onboardingType == 'federation' ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                              boxShadow: _onboardingType == 'federation'
                                  ? const [
                                      BoxShadow(
                                        color: Color(0x0F000000),
                                        blurRadius: 8,
                                        offset: Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.corporate_fare,
                                  size: 16,
                                  color: _onboardingType == 'federation' ? AppTheme.primaryBlue : AppTheme.textSecondary,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  l10n.tr('federation_worker'),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: _onboardingType == 'federation' ? FontWeight.w800 : FontWeight.w600,
                                    color: _onboardingType == 'federation' ? AppTheme.primaryBlue : AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _onboardingType = 'independent'),
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _onboardingType == 'independent' ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                              boxShadow: _onboardingType == 'independent'
                                  ? const [
                                      BoxShadow(
                                        color: Color(0x0F000000),
                                        blurRadius: 8,
                                        offset: Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.person,
                                  size: 16,
                                  color: _onboardingType == 'independent' ? AppTheme.primaryBlue : AppTheme.textSecondary,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  l10n.tr('independent_worker'),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: _onboardingType == 'independent' ? FontWeight.w800 : FontWeight.w600,
                                    color: _onboardingType == 'independent' ? AppTheme.primaryBlue : AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Login Form Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppTheme.radiusXLarge),
                    boxShadow: AppTheme.cardShadow,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Text(
                          _onboardingType == 'federation' ? l10n.tr('federation_worker_login') : l10n.tr('independent_worker_onboarding'),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textDark,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Center(
                        child: Text(
                          _onboardingType == 'federation'
                              ? l10n.tr('enter_preregistered_mobile')
                              : l10n.tr('enter_mobile_self_register'),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      Text(
                        l10n.tr('mobile_number_caps'),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textSecondary,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),

                      Row(
                        children: [
                          // Country Code Selector
                          Container(
                            height: 52,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                              border: Border.all(color: AppTheme.borderLight),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _countryCode,
                                icon: const Icon(Icons.keyboard_arrow_down, size: 20, color: AppTheme.textSecondary),
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textDark,
                                ),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() => _countryCode = val);
                                  }
                                },
                                items: const [
                                  DropdownMenuItem(value: '+91', child: Text('+91')),
                                  DropdownMenuItem(value: '+1', child: Text('+1')),
                                  DropdownMenuItem(value: '+44', child: Text('+44')),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),

                          // Phone Input
                          Expanded(
                            child: SizedBox(
                              height: 52,
                              child: TextField(
                                controller: _phoneController,
                                keyboardType: TextInputType.phone,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textDark,
                                ),
                                decoration: InputDecoration(
                                  hintText: l10n.tr('phone_hint'),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Send OTP Button
                      AppButton(
                        text: l10n.tr('send_otp'),
                        suffixIcon: Icons.arrow_forward,
                        isLoading: authProvider.isLoading,
                        onPressed: _handleSendOtp,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Terms of Service footer
                const Text(
                  'By continuing, you agree to our Terms of\nService and Privacy Policy.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

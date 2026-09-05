import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_button.dart';
import 'otp_verify_screen.dart';

class PhoneAuthScreen extends StatefulWidget {
  const PhoneAuthScreen({super.key});

  @override
  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  final TextEditingController _phoneController = TextEditingController(text: '9000011111');
  String _countryCode = '+91';

  Future<void> _handleSendOtp() async {
    final l10n = AppLocalizations.of(context);
    final phoneNum = _phoneController.text.trim();
    if (phoneNum.isEmpty || phoneNum.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.tr('invalid_phone'))),
      );
      return;
    }

    final fullPhone = '$_countryCode$phoneNum';
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.requestOtp(fullPhone);

    if (success && mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => OtpVerifyScreen(phoneNumber: fullPhone),
        ),
      );
    } else if (mounted && authProvider.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage!),
          backgroundColor: AppTheme.dangerRed,
        ),
      );
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
            child: Container(
              padding: const EdgeInsets.all(28.0),
              decoration: BoxDecoration(
                color: AppTheme.surfaceWhite,
                borderRadius: BorderRadius.circular(24.0),
                boxShadow: AppTheme.cardShadow,
                border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Circular Logo Emblem matching Figma
                  Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(
                      color: AppTheme.primaryBlue,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.handshake_rounded,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Brand Title & Subtitle
                  Text(
                    l10n.tr('app_title'),
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.tr('login_subtitle'),
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.textSecondary,
                      fontWeight: FontWeight.w400,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 28),

                  // Phone Input Container matching Figma #EEF4FF
                  Container(
                    decoration: BoxDecoration(
                      color: AppTheme.lightBlueBg,
                      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      children: [
                        // Country Code Selector
                        DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _countryCode,
                            items: const [
                              DropdownMenuItem(value: '+91', child: Text('+91 🇮🇳', style: TextStyle(fontWeight: FontWeight.w700))),
                              DropdownMenuItem(value: '+1', child: Text('+1 🇺🇸', style: TextStyle(fontWeight: FontWeight.w700))),
                            ],
                            onChanged: (val) {
                              if (val != null) setState(() => _countryCode = val);
                            },
                          ),
                        ),
                        Container(
                          height: 28,
                          width: 1,
                          color: AppTheme.borderLight,
                          margin: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                        // Number Input
                        Expanded(
                          child: TextField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                            decoration: InputDecoration(
                              hintText: l10n.tr('phone_hint'),
                              hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 15),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Send OTP Primary Button
                  AppButton(
                    label: l10n.tr('send_otp'),
                    suffixIcon: Icons.arrow_forward_rounded,
                    isLoading: authProvider.isLoading,
                    onPressed: _handleSendOtp,
                  ),

                  const SizedBox(height: 24),
                  const Divider(color: AppTheme.dividerColor),
                  const SizedBox(height: 16),

                  Text(
                    l10n.tr('coop_guarantee_subtitle'),
                    style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

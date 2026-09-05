import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../providers/worker_auth_provider.dart';
import '../../widgets/app_button.dart';
import '../home/worker_main_screen.dart';
import '../profile_setup/worker_profile_setup_screen.dart';

class WorkerOtpScreen extends StatefulWidget {
  final String phoneNumber;

  const WorkerOtpScreen({
    super.key,
    required this.phoneNumber,
  });

  @override
  State<WorkerOtpScreen> createState() => _WorkerOtpScreenState();
}

class _WorkerOtpScreenState extends State<WorkerOtpScreen> {
  final List<TextEditingController> _controllers = [
    TextEditingController(text: '1'),
    TextEditingController(text: '2'),
    TextEditingController(text: '3'),
    TextEditingController(text: '4'),
    TextEditingController(text: '5'),
    TextEditingController(text: '6'),
  ];
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  int _resendCountdown = 44;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startResendTimer();
    // Pre-fill mock OTP matching backend dev mock (123456)
    for (int i = 0; i < 6; i++) {
      _controllers[i].text = '${i + 1}';
    }
  }

  void _startResendTimer() {
    _timer?.cancel();
    _resendCountdown = 44;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendCountdown > 0) {
        setState(() => _resendCountdown--);
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (var c in _controllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _otpCode => _controllers.map((c) => c.text).join();

  Future<void> _handleVerify() async {
    final l10n = WorkerLocalizations.of(context);
    final code = _otpCode;
    if (code.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.tr('enter_complete_otp'))),
      );
      return;
    }

    final authProvider = Provider.of<WorkerAuthProvider>(context, listen: false);
    final success = await authProvider.verifyOtp(code);

    if (mounted) {
      if (success) {
        if (authProvider.isNewWorker || !authProvider.isProfileCompleted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const WorkerProfileSetupScreen()),
            (route) => false,
          );
        } else {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const WorkerMainScreen()),
            (route) => false,
          );
        }
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
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline, color: AppTheme.textSecondary),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(l10n.tr('support_24_7'))),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),
              Text(
                l10n.tr('verify_your_number'),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textDark,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.tr('enter_code_sent_to'),
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                widget.phoneNumber,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textDark,
                ),
              ),
              const SizedBox(height: 32),

              // 6 PIN Input Boxes
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(6, (index) {
                  return SizedBox(
                    width: 48,
                    height: 56,
                    child: TextField(
                      controller: _controllers[index],
                      focusNode: _focusNodes[index],
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      maxLength: 1,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textDark,
                      ),
                      decoration: InputDecoration(
                        counterText: '',
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: EdgeInsets.zero,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          borderSide: BorderSide(
                            color: _controllers[index].text.isNotEmpty
                                ? AppTheme.primaryBlue
                                : AppTheme.borderLight,
                            width: 1.5,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          borderSide: const BorderSide(
                            color: AppTheme.primaryBlue,
                            width: 2,
                          ),
                        ),
                      ),
                      onChanged: (value) {
                        if (value.isNotEmpty && index < 5) {
                          _focusNodes[index + 1].requestFocus();
                        } else if (value.isEmpty && index > 0) {
                          _focusNodes[index - 1].requestFocus();
                        }
                      },
                    ),
                  );
                }),
              ),
              const SizedBox(height: 32),

              // Resend Countdown
              Center(
                child: Column(
                  children: [
                    Text(
                      l10n.tr('did_not_receive_code'),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.access_time, size: 14, color: AppTheme.textSecondary),
                        const SizedBox(width: 4),
                        Text(
                          _resendCountdown > 0
                              ? l10n.tr('resend_in_timer', params: {'time': '00:${_resendCountdown.toString().padLeft(2, '0')}'})
                              : l10n.tr('resend_code_now'),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: _resendCountdown > 0 ? AppTheme.textSecondary : AppTheme.primaryBlue,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Spacer(),

              // Verify & Continue Button
              AppButton(
                text: l10n.tr('verify_and_continue'),
                isLoading: authProvider.isLoading,
                onPressed: _handleVerify,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

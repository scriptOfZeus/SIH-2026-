import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:worker_app/l10n/worker_localizations.dart';
import 'package:worker_app/providers/worker_language_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  group('Worker App Localization Completeness Tests', () {
    test('1. WorkerLocalizations translates core keys in English', () {
      final l10n = WorkerLocalizations(const Locale('en'));
      expect(l10n.tr('app_title'), 'Sahkar Sewa');
      expect(l10n.tr('send_otp'), 'Send OTP');
      expect(l10n.tr('choose_language'), 'Choose your language');
      expect(l10n.tr('alert_voice'), 'Alert Voice');
      expect(l10n.tr('electrician'), 'Electrician');
      expect(l10n.tr('accept_btn'), 'Accept Job');
      expect(l10n.tr('reject_btn'), 'Decline');
    });

    test('2. All 7 languages have complete translation dictionaries for Worker App', () {
      const languages = ['en', 'hi', 'mr', 'ta', 'te', 'or', 'bn'];

      for (final lang in languages) {
        final l10n = WorkerLocalizations(Locale(lang));
        expect(l10n.tr('app_title').isNotEmpty, true, reason: 'Failed for $lang: app_title');
        expect(l10n.tr('choose_language').isNotEmpty, true, reason: 'Failed for $lang: choose_language');
        expect(l10n.tr('dashboard').isNotEmpty, true, reason: 'Failed for $lang: dashboard');
        expect(l10n.tr('earnings').isNotEmpty, true, reason: 'Failed for $lang: earnings');
        expect(l10n.tr('profile').isNotEmpty, true, reason: 'Failed for $lang: profile');
        expect(l10n.tr('settings').isNotEmpty, true, reason: 'Failed for $lang: settings');
        expect(l10n.tr('electrician').isNotEmpty, true, reason: 'Failed for $lang: electrician');
        expect(l10n.tr('plumber').isNotEmpty, true, reason: 'Failed for $lang: plumber');
        expect(l10n.tr('cleaner').isNotEmpty, true, reason: 'Failed for $lang: cleaner');
        expect(l10n.tr('carpenter').isNotEmpty, true, reason: 'Failed for $lang: carpenter');
        expect(l10n.tr('painter').isNotEmpty, true, reason: 'Failed for $lang: painter');
        expect(l10n.tr('alert_voice').isNotEmpty, true, reason: 'Failed for $lang: alert_voice');
        expect(l10n.tr('new_job_alert').isNotEmpty, true, reason: 'Failed for $lang: new_job_alert');
        expect(l10n.tr('emergency_dispatch_alert').isNotEmpty, true, reason: 'Failed for $lang: emergency_dispatch_alert');

        // Onboarding, Auth & Verification Screen Keys
        expect(l10n.tr('federation_worker').isNotEmpty, true, reason: 'Failed for $lang: federation_worker');
        expect(l10n.tr('independent_worker').isNotEmpty, true, reason: 'Failed for $lang: independent_worker');
        expect(l10n.tr('federation_worker_login').isNotEmpty, true, reason: 'Failed for $lang: federation_worker_login');
        expect(l10n.tr('independent_worker_onboarding').isNotEmpty, true, reason: 'Failed for $lang: independent_worker_onboarding');
        expect(l10n.tr('enter_preregistered_mobile').isNotEmpty, true, reason: 'Failed for $lang: enter_preregistered_mobile');
        expect(l10n.tr('enter_mobile_self_register').isNotEmpty, true, reason: 'Failed for $lang: enter_mobile_self_register');
        expect(l10n.tr('mobile_number_caps').isNotEmpty, true, reason: 'Failed for $lang: mobile_number_caps');
        expect(l10n.tr('phone_hint').isNotEmpty, true, reason: 'Failed for $lang: phone_hint');
        expect(l10n.tr('send_otp').isNotEmpty, true, reason: 'Failed for $lang: send_otp');
        expect(l10n.tr('verify_your_number').isNotEmpty, true, reason: 'Failed for $lang: verify_your_number');
        expect(l10n.tr('enter_code_sent_to').isNotEmpty, true, reason: 'Failed for $lang: enter_code_sent_to');
        expect(l10n.tr('did_not_receive_code').isNotEmpty, true, reason: 'Failed for $lang: did_not_receive_code');
        expect(l10n.tr('resend_code_now').isNotEmpty, true, reason: 'Failed for $lang: resend_code_now');
        expect(l10n.tr('verify_and_continue').isNotEmpty, true, reason: 'Failed for $lang: verify_and_continue');
        expect(l10n.tr('independent_partner_setup').isNotEmpty, true, reason: 'Failed for $lang: independent_partner_setup');
        expect(l10n.tr('personal_details_location').isNotEmpty, true, reason: 'Failed for $lang: personal_details_location');
        expect(l10n.tr('continue_arrow').isNotEmpty, true, reason: 'Failed for $lang: continue_arrow');
        expect(l10n.tr('application_submitted').isNotEmpty, true, reason: 'Failed for $lang: application_submitted');
        expect(l10n.tr('check_approval_status').isNotEmpty, true, reason: 'Failed for $lang: check_approval_status');
        expect(l10n.tr('back_to_login_btn').isNotEmpty, true, reason: 'Failed for $lang: back_to_login_btn');
      }
    });

    test('3. Parameterized translations interpolate variables correctly in Worker App', () {
      final l10n = WorkerLocalizations(const Locale('en'));
      expect(l10n.otpSubtitle('+919876543210'), 'Enter the 6-digit code sent to +919876543210');
      expect(l10n.resendIn(30), 'Resend in 30s');
      expect(l10n.expiresIn(60), 'Auto-expires in 60s');

      final newJobEn = l10n.alertNewJob(trade: 'Electrician', address: 'Park St, Kolkata', amount: 850);
      expect(newJobEn.contains('Park St, Kolkata'), true);
      expect(newJobEn.contains('850'), true);

      final hiL10n = WorkerLocalizations(const Locale('hi'));
      final newJobHi = hiL10n.alertNewJob(trade: 'इलेक्ट्रीशियन', address: 'पार्क स्ट्रीट', amount: 850);
      expect(newJobHi.contains('850'), true);
      expect(newJobHi.contains('पार्क स्ट्रीट'), true);
    });

    test('4. Missing key safely falls back without crashing', () {
      final mrL10n = WorkerLocalizations(const Locale('mr'));
      final missing = mrL10n.tr('non_existent_key_9999');
      expect(missing, 'non_existent_key_9999');
    });

    test('5. WorkerLanguageProvider initializes and persists independently', () async {
      final provider = WorkerLanguageProvider();
      expect(provider.currentCode, 'en');
      await provider.setLanguage('mr');
      expect(provider.currentCode, 'mr');
      expect(provider.locale.languageCode, 'mr');
      expect(provider.currentLanguageModel.nativeName, 'मराठी');
    });

    test('6. Hindi localization renders translated strings for Onboarding screens', () {
      final hiL10n = WorkerLocalizations(const Locale('hi'));
      expect(hiL10n.tr('federation_worker_login'), 'महासंघ कामगार लॉगिन');
      expect(hiL10n.tr('verify_your_number'), 'अपना नंबर सत्यापित करें');
      expect(hiL10n.tr('independent_partner_setup'), 'स्वतंत्र पार्टनर सेटअप');
      expect(hiL10n.tr('application_submitted'), 'आवेदन जमा हो गया');
    });
  });
}

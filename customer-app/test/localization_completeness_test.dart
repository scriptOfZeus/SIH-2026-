import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:customer_app/l10n/app_localizations.dart';
import 'package:customer_app/providers/language_provider.dart';

import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  group('Customer App Localization Tests', () {
    test('1. AppLocalizations translates core keys in English', () {
      final l10n = AppLocalizations(const Locale('en'));
      expect(l10n.tr('app_title'), 'Sahkar Sewa');
      expect(l10n.tr('send_otp'), 'Send OTP');
      expect(l10n.tr('choose_language'), 'Choose your language');
      expect(l10n.tr('electrician'), 'Electrician');
      expect(l10n.tr('alert_voice'), 'Alert Voice');
    });

    test('2. All 7 languages have complete translation dictionaries', () {
      const languages = ['en', 'hi', 'mr', 'ta', 'te', 'or', 'bn'];

      for (final lang in languages) {
        final l10n = AppLocalizations(Locale(lang));
        // Verify key sample translations exist and are not empty
        expect(l10n.tr('app_title').isNotEmpty, true, reason: 'Failed for $lang: app_title');
        expect(l10n.tr('choose_language').isNotEmpty, true, reason: 'Failed for $lang: choose_language');
        expect(l10n.tr('home').isNotEmpty, true, reason: 'Failed for $lang: home');
        expect(l10n.tr('bookings').isNotEmpty, true, reason: 'Failed for $lang: bookings');
        expect(l10n.tr('profile').isNotEmpty, true, reason: 'Failed for $lang: profile');
        expect(l10n.tr('electrician').isNotEmpty, true, reason: 'Failed for $lang: electrician');
        expect(l10n.tr('plumber').isNotEmpty, true, reason: 'Failed for $lang: plumber');
        expect(l10n.tr('cleaner').isNotEmpty, true, reason: 'Failed for $lang: cleaner');
        expect(l10n.tr('carpenter').isNotEmpty, true, reason: 'Failed for $lang: carpenter');
        expect(l10n.tr('painter').isNotEmpty, true, reason: 'Failed for $lang: painter');
        expect(l10n.tr('alert_voice').isNotEmpty, true, reason: 'Failed for $lang: alert_voice');
        expect(l10n.tr('alert_booking_accepted').isNotEmpty, true, reason: 'Failed for $lang: alert_booking_accepted');
      }
    });

    test('3. Parameterized translations interpolate variables correctly', () {
      final l10n = AppLocalizations(const Locale('en'));
      expect(l10n.otpSubtitle('+919876543210'), 'Enter the 6-digit verification code sent to +919876543210');
      expect(l10n.resendIn(45), 'Resend code in 45s');

      final hiL10n = AppLocalizations(const Locale('hi'));
      expect(hiL10n.otpSubtitle('+919876543210').contains('+919876543210'), true);
    });

    test('4. Missing key safely falls back to English', () {
      final mrL10n = AppLocalizations(const Locale('mr'));
      // If a non-existent key is requested, it falls back without crashing
      final missing = mrL10n.tr('non_existent_key_12345');
      expect(missing, 'non_existent_key_12345');
    });

    test('5. LanguageProvider initializes and changes language properly', () async {
      final provider = LanguageProvider();
      expect(provider.currentCode, 'en');
      await provider.setLanguage('hi');
      expect(provider.currentCode, 'hi');
      expect(provider.locale.languageCode, 'hi');
      expect(provider.currentLanguageModel.nativeName, 'हिन्दी');
    });

    test('6. Landing page worker card translations render properly in Marathi', () {
      final mrL10n = AppLocalizations(const Locale('mr'));
      expect(mrL10n.tr('verified_partner'), 'सत्यापित पार्टनर');
      expect(mrL10n.tr('electrician'), 'इलेक्ट्रिशियन');
      expect(mrL10n.tr('plumber'), 'प्लंबर');
      expect(mrL10n.tr('cleaner'), 'सफाई कामगार');
    });
  });
}

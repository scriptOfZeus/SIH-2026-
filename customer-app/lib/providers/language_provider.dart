import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/alert_tts_service.dart';

class LanguageModel {
  final String code;
  final String englishName;
  final String nativeName;

  const LanguageModel({
    required this.code,
    required this.englishName,
    required this.nativeName,
  });
}

class LanguageProvider extends ChangeNotifier {
  static const String _prefKeyLanguage = 'customer_language';
  static const String _prefKeySelected = 'customer_language_selected';

  static const List<LanguageModel> supportedLanguages = [
    LanguageModel(code: 'en', englishName: 'English', nativeName: 'English'),
    LanguageModel(code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी'),
    LanguageModel(code: 'mr', englishName: 'Marathi', nativeName: 'मराठी'),
    LanguageModel(code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்'),
    LanguageModel(code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు'),
    LanguageModel(code: 'or', englishName: 'Odia', nativeName: 'ଓଡ଼ିଆ'),
    LanguageModel(code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা'),
  ];

  static const List<Locale> supportedLocales = [
    Locale('en'),
    Locale('hi'),
    Locale('mr'),
    Locale('ta'),
    Locale('te'),
    Locale('or'),
    Locale('bn'),
  ];

  Locale _locale = const Locale('en');
  bool _isFirstLaunch = false;
  bool _isInitialized = false;

  Locale get locale => _locale;
  String get currentCode => _locale.languageCode;
  bool get isFirstLaunch => _isFirstLaunch;
  bool get isInitialized => _isInitialized;

  LanguageModel get currentLanguageModel {
    return supportedLanguages.firstWhere(
      (l) => l.code == _locale.languageCode,
      orElse: () => supportedLanguages.first,
    );
  }

  Future<void> initLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    final bool hasSelected = prefs.getBool(_prefKeySelected) ?? false;
    final String? savedLang = prefs.getString(_prefKeyLanguage);

    if (!hasSelected || savedLang == null) {
      _isFirstLaunch = true;
      _locale = const Locale('en');
    } else {
      _isFirstLaunch = false;
      _locale = Locale(savedLang);
    }
    AlertTtsService.setLanguage(_locale.languageCode);
    _isInitialized = true;
    notifyListeners();
  }

  Future<void> setLanguage(String langCode) async {
    if (!supportedLanguages.any((l) => l.code == langCode)) return;

    _locale = Locale(langCode);
    _isFirstLaunch = false;
    AlertTtsService.setLanguage(langCode);
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKeyLanguage, langCode);
    await prefs.setBool(_prefKeySelected, true);
  }

  Future<void> completeFirstLaunch(String langCode) async {
    await setLanguage(langCode);
  }
}

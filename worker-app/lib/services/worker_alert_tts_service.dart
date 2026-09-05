import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Centralized Cross-Platform Alert-Only Text-to-Speech (TTS) Service for Sahkar Sewa Worker App.
/// 
/// Strictly for critical worker alerts/events:
/// - New job request incoming
/// - Priority emergency dispatch
/// - Job cancellation
/// - Verification approval
/// - Payment/earnings confirmation
/// 
/// Does NOT perform screen narration, element reading, or conversational audio.
class WorkerAlertTtsService {
  static const String _prefAlertVoice = 'worker_alert_voice_enabled';

  static FlutterTts? _flutterTts;
  static bool _isInitialized = false;
  static bool _isEnabled = true;
  static String _currentLanguage = 'en';

  // In-memory sliding window for alert deduplication (keeps spoken alert IDs for 45 seconds)
  static final Map<String, DateTime> _spokenAlertHistory = {};
  static const Duration _dedupWindow = Duration(seconds: 45);

  // Fallback hierarchies mapped per language requirement
  static const Map<String, List<String>> _ttsLocaleHierarchy = {
    'en': ['en-IN', 'en-US', 'en-GB', 'en'],
    'hi': ['hi-IN', 'hi', 'en-IN'],
    'mr': ['mr-IN', 'hi-IN', 'hi', 'en-IN'],
    'ta': ['ta-IN', 'ta', 'en-IN'],
    'te': ['te-IN', 'te', 'en-IN'],
    'or': ['or-IN', 'hi-IN', 'hi', 'en-IN'],
    'bn': ['bn-IN', 'bn', 'en-IN'],
  };

  /// Initialize TTS once lazily or on app startup
  static Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      _isEnabled = prefs.getBool(_prefAlertVoice) ?? true;

      _flutterTts = FlutterTts();

      await _flutterTts!.setSpeechRate(kIsWeb ? 0.95 : 0.5);
      await _flutterTts!.setVolume(1.0);
      await _flutterTts!.setPitch(1.0);

      _flutterTts!.setErrorHandler((msg) {
        if (kDebugMode) {
          debugPrint('[WorkerAlertTtsService] Engine error: $msg');
        }
      });

      _isInitialized = true;
      if (kDebugMode) {
        debugPrint('[WorkerAlertTtsService] Initialized successfully. Voice enabled: $_isEnabled');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[WorkerAlertTtsService] Initialization failed gracefully: $e');
      }
      _isInitialized = false;
    }
  }

  /// Whether Alert Voice is enabled by the worker
  static bool get isEnabled => _isEnabled;

  /// Enable or disable alert voice with immediate persistence
  static Future<void> setEnabled(bool enabled) async {
    _isEnabled = enabled;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_prefAlertVoice, enabled);
      if (!enabled) {
        await stop();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[WorkerAlertTtsService] Failed to save alert voice setting: $e');
      }
    }
  }

  /// Updates active language code (en, hi, mr, ta, te, or, bn)
  static Future<void> setLanguage(String langCode) async {
    _currentLanguage = langCode;
    await stop();
  }

  /// Speaks a localized alert text strictly if:
  /// 1. Voice alerts are enabled
  /// 2. Alert has not already been spoken recently (deduplication)
  static Future<void> speakAlert({
    required String alertId,
    required String localizedText,
    String? languageCode,
  }) async {
    if (!_isEnabled) return;

    // 1. Deduplication check
    final now = DateTime.now();
    _cleanupExpiredDeduplications(now);

    if (_spokenAlertHistory.containsKey(alertId)) {
      if (kDebugMode) {
        debugPrint('[WorkerAlertTtsService] Dropping duplicate alert speech: $alertId');
      }
      return;
    }
    _spokenAlertHistory[alertId] = now;

    // 2. Ensure engine initialized
    if (!_isInitialized || _flutterTts == null) {
      await initialize();
    }

    if (_flutterTts == null) return;

    // 3. Resolve best matching locale with fallback hierarchy
    final lang = languageCode ?? _currentLanguage;
    final localesToTry = _ttsLocaleHierarchy[lang] ?? ['en-IN', 'en-US'];

    try {
      bool matched = false;
      for (final targetLocale in localesToTry) {
        try {
          final isAvailable = await _flutterTts!.isLanguageAvailable(targetLocale);
          if (isAvailable == true || isAvailable == 1) {
            await _flutterTts!.setLanguage(targetLocale);
            matched = true;
            break;
          }
        } catch (_) {
          // Continue to next fallback
        }
      }

      if (!matched && localesToTry.isNotEmpty) {
        try {
          await _flutterTts!.setLanguage(localesToTry.first);
        } catch (_) {
          await _flutterTts!.setLanguage('en-IN');
        }
      }

      // 4. Cancel any ongoing speech and speak alert
      await _flutterTts!.stop();
      await _flutterTts!.speak(localizedText);

      if (kDebugMode) {
        debugPrint('[WorkerAlertTtsService] Spoke alert [$alertId]: "$localizedText"');
      }
    } catch (e) {
      // Speech failure must never crash or block the application
      if (kDebugMode) {
        debugPrint('[WorkerAlertTtsService] Speech failed gracefully: $e');
      }
    }
  }

  /// Immediately stop any ongoing alert speech
  static Future<void> stop() async {
    try {
      if (_flutterTts != null) {
        await _flutterTts!.stop();
      }
    } catch (_) {}
  }

  /// Clean expired alert IDs from memory
  static void _cleanupExpiredDeduplications(DateTime now) {
    _spokenAlertHistory.removeWhere(
      (_, timestamp) => now.difference(timestamp) > _dedupWindow,
    );
  }

  /// Optional warm-up call triggered by user gesture
  static Future<void> warmUpUserGesture() async {
    if (!_isInitialized) {
      await initialize();
    }
  }
}

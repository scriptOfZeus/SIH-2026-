import 'package:flutter/material.dart';

class AppTheme {
  // Brand Color Palette
  static const Color primaryBlue = Color(0xFF0D47A1);
  static const Color primaryDark = Color(0xFF002171);
  static const Color primaryLight = Color(0xFF5472D3);
  static const Color accentBlue = Color(0xFF1976D2);
  static const Color lightBlueBg = Color(0xFFF0F4FA);
  static const Color scaffoldBg = Color(0xFFF7F9FC);
  static const Color surfaceWhite = Colors.white;

  // Semantic & Urgency Accents
  static const Color emergencyOrange = Color(0xFFE65100);
  static const Color emergencyLightBg = Color(0xFFFFF3E0);
  static const Color emergencyBorder = Color(0xFFFFB74D);
  static const Color verifiedGreen = Color(0xFF2E7D32);
  static const Color verifiedLightBg = Color(0xFFE8F5E9);
  static const Color ratingYellow = Color(0xFFFFB300);
  static const Color dangerRed = Color(0xFFD32F2F);
  static const Color dangerLightBg = Color(0xFFFFEBEE);

  // Text Colors
  static const Color textPrimary = Color(0xFF1E293B);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textDark = Color(0xFF0F172A);

  // Border & Divider
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color dividerColor = Color(0xFFEDF2F7);

  // Corner Radius
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  static const double radiusXLarge = 24.0;

  // Box Shadows
  static List<BoxShadow> get cardShadow => const [
        BoxShadow(
          color: Color(0x0A0F172A),
          blurRadius: 10,
          offset: Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get primaryButtonShadow => [
        BoxShadow(
          color: primaryBlue.withValues(alpha: 0.25),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get emergencyButtonShadow => [
        BoxShadow(
          color: emergencyOrange.withValues(alpha: 0.3),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];

  // ThemeData configuration
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryBlue,
        primary: primaryBlue,
        secondary: accentBlue,
        surface: surfaceWhite,
      ),
      scaffoldBackgroundColor: scaffoldBg,
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: surfaceWhite,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0,
        titleTextStyle: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: textPrimary,
          letterSpacing: -0.2,
        ),
      ),
      cardTheme: CardThemeData(
        color: surfaceWhite,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          side: const BorderSide(color: borderLight, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceWhite,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: primaryBlue, width: 1.5),
        ),
        hintStyle: const TextStyle(color: textMuted, fontSize: 14),
      ),
    );
  }
}

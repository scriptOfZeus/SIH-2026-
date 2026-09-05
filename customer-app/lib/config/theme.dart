import 'package:flutter/material.dart';

/// Design tokens strictly matching the exported Figma customer designs.
class AppTheme {
  // Brand Colors
  static const Color primaryBlue = Color(0xFF003399); // Dark corporate royal blue
  static const Color primaryDark = Color(0xFF002266);
  static const Color accentBlue = Color(0xFF2563EB);
  static const Color lightBlueBg = Color(0xFFEEF4FF); // Input containers & light cards
  static const Color softBlueSurface = Color(0xFFDCE8FC);
  static const Color surfaceWhite = Color(0xFFFFFFFF);
  static const Color scaffoldBg = Color(0xFFF8FAFD);

  // Status & Accent Colors
  static const Color verifiedGreen = Color(0xFF059669);
  static const Color verifiedGreenBg = Color(0xFFD1FAE5);
  static const Color ratingYellow = Color(0xFFF59E0B);
  static const Color warningOrange = Color(0xFFEA580C);
  static const Color dangerRed = Color(0xFFDC2626);
  static const Color errorRed = dangerRed;
  static const Color dangerRedBg = Color(0xFFFFE4E4);

  // Neutral & Typography Colors
  static const Color textPrimary = Color(0xFF0A192F);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color dividerColor = Color(0xFFEDF2F7);

  // Border Radii
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  static const double radiusPill = 100.0;

  // Box Shadows
  static List<BoxShadow> cardShadow = [
    BoxShadow(
      color: const Color(0xFF0F172A).withOpacity(0.04),
      blurRadius: 16,
      offset: const Offset(0, 4),
    ),
    BoxShadow(
      color: const Color(0xFF0F172A).withOpacity(0.02),
      blurRadius: 4,
      offset: const Offset(0, 1),
    ),
  ];

  static List<BoxShadow> primaryButtonShadow = [
    BoxShadow(
      color: primaryBlue.withOpacity(0.25),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
  ];

  // ThemeData
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: scaffoldBg,
      primaryColor: primaryBlue,
      colorScheme: const ColorScheme.light(
        primary: primaryBlue,
        secondary: accentBlue,
        surface: surfaceWhite,
        error: dangerRed,
        onPrimary: surfaceWhite,
        onSurface: textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: scaffoldBg,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: textPrimary),
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
      ),
      fontFamily: 'Inter',
      textTheme: const TextTheme(
        displayLarge: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: textPrimary, letterSpacing: -0.5),
        displayMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: textPrimary, letterSpacing: -0.4),
        titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: textPrimary, letterSpacing: -0.3),
        titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: textPrimary),
        titleSmall: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: textPrimary),
        bodyLarge: TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: textSecondary),
        bodyMedium: TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: textSecondary),
        labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: surfaceWhite),
      ),
    );
  }
}

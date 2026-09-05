import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'l10n/app_localizations.dart';
import 'providers/auth_provider.dart';
import 'providers/booking_provider.dart';
import 'providers/customer_provider.dart';
import 'providers/language_provider.dart';
import 'screens/auth/phone_auth_screen.dart';
import 'screens/home/main_navigation_screen.dart';
import 'screens/language/language_select_screen.dart';
import 'services/alert_tts_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AlertTtsService.initialize();
  runApp(const CustomerApp());
}

class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LanguageProvider()..initLanguage()),
        ChangeNotifierProvider(create: (_) => AuthProvider()..initAuth()),
        ChangeNotifierProvider(create: (_) => CustomerProvider()),
        ChangeNotifierProvider(create: (_) => BookingProvider()),
      ],
      child: Consumer<LanguageProvider>(
        builder: (context, languageProvider, _) {
          return MaterialApp(
            title: 'Sahkar Sewa',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            locale: languageProvider.locale,
            supportedLocales: LanguageProvider.supportedLocales,
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            builder: (context, child) {
              if (!kIsWeb) {
                return child ?? const SizedBox.shrink();
              }
              return Container(
                color: const Color(0xFFE2E8F0),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 450),
                    child: Container(
                      decoration: const BoxDecoration(
                        boxShadow: [
                          BoxShadow(
                            color: Color(0x1A0F172A),
                            blurRadius: 24,
                            offset: Offset(0, 8),
                          ),
                        ],
                      ),
                      child: ClipRect(child: child ?? const SizedBox.shrink()),
                    ),
                  ),
                ),
              );
            },
            home: const AuthGate(),
          );
        },
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final auth = Provider.of<AuthProvider>(context);

    // 1. Wait for language provider initialization
    if (!languageProvider.isInitialized) {
      return const Scaffold(
        backgroundColor: AppTheme.scaffoldBg,
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryBlue),
          ),
        ),
      );
    }

    // 2. First launch route directly to Language Selection
    if (languageProvider.isFirstLaunch) {
      return const LanguageSelectScreen(isFromSettings: false);
    }

    // 3. Auth loading state
    if (auth.state == AuthState.uninitialized) {
      return const Scaffold(
        backgroundColor: AppTheme.scaffoldBg,
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryBlue),
          ),
        ),
      );
    }

    // 4. Authenticated -> Main Navigation
    if (auth.isAuthenticated) {
      return const MainNavigationScreen();
    }

    // 5. Unauthenticated -> Phone Auth
    return const PhoneAuthScreen();
  }
}

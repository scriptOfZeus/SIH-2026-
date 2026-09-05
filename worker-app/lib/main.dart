import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'l10n/worker_localizations.dart';
import 'providers/worker_auth_provider.dart';
import 'providers/worker_booking_provider.dart';
import 'providers/worker_earnings_provider.dart';
import 'providers/worker_language_provider.dart';
import 'providers/worker_profile_provider.dart';
import 'screens/auth/worker_login_screen.dart';
import 'screens/home/worker_main_screen.dart';
import 'screens/language/worker_language_select_screen.dart';
import 'services/worker_alert_tts_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await WorkerAlertTtsService.initialize();
  runApp(const WorkerRootApp());
}

class WorkerRootApp extends StatelessWidget {
  const WorkerRootApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => WorkerLanguageProvider()..initLanguage()),
        ChangeNotifierProvider(create: (_) => WorkerAuthProvider()..checkAuthStatus()),
        ChangeNotifierProvider(create: (_) => WorkerProfileProvider()),
        ChangeNotifierProvider(create: (_) => WorkerBookingProvider()),
        ChangeNotifierProvider(create: (_) => WorkerEarningsProvider()),
      ],
      child: Consumer<WorkerLanguageProvider>(
        builder: (context, langProvider, _) {
          return MaterialApp(
            title: 'Sahkar Sewa Worker',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            locale: langProvider.locale,
            supportedLocales: WorkerLanguageProvider.supportedLocales,
            localizationsDelegates: const [
              WorkerLocalizations.delegate,
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
            home: const WorkerAuthGate(),
          );
        },
      ),
    );
  }
}

class WorkerAuthGate extends StatelessWidget {
  const WorkerAuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final langProvider = Provider.of<WorkerLanguageProvider>(context);
    final authProvider = Provider.of<WorkerAuthProvider>(context);

    // 1. Loading language preferences
    if (!langProvider.isInitialized) {
      return const Scaffold(
        backgroundColor: AppTheme.lightBlueBg,
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryBlue),
        ),
      );
    }

    // 2. First launch route to Worker Language Picker
    if (langProvider.isFirstLaunch) {
      return const WorkerLanguageSelectScreen(isFromSettings: false);
    }

    // 3. Auth initializing
    if (authProvider.isInitializing) {
      return const Scaffold(
        backgroundColor: AppTheme.lightBlueBg,
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryBlue),
        ),
      );
    }

    // 4. Authenticated Worker -> Main Screen
    if (authProvider.isLoggedIn) {
      return const WorkerMainScreen();
    }

    // 5. Unauthenticated -> Login Screen
    return const WorkerLoginScreen();
  }
}

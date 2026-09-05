import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:worker_app/config/theme.dart';
import 'package:worker_app/models/worker_booking_model.dart';
import 'package:worker_app/providers/worker_auth_provider.dart';
import 'package:worker_app/providers/worker_booking_provider.dart';
import 'package:worker_app/providers/worker_earnings_provider.dart';
import 'package:worker_app/providers/worker_profile_provider.dart';
import 'package:worker_app/screens/active_job/active_job_screen.dart';
import 'package:worker_app/screens/active_job/complete_service_screen.dart';
import 'package:worker_app/screens/active_job/customer_communication_screen.dart';
import 'package:worker_app/screens/auth/worker_login_screen.dart';
import 'package:worker_app/screens/auth/worker_otp_screen.dart';
import 'package:worker_app/screens/earnings/worker_earnings_screen.dart';
import 'package:worker_app/screens/home/worker_dashboard_screen.dart';
import 'package:worker_app/screens/home/worker_main_screen.dart';
import 'package:worker_app/screens/jobs/emergency_request_modal.dart';
import 'package:worker_app/screens/jobs/job_history_screen.dart';
import 'package:worker_app/screens/jobs/job_request_details_screen.dart';
import 'package:worker_app/screens/profile/worker_profile_screen.dart';
import 'package:worker_app/screens/profile/worker_settings_screen.dart';
import 'package:worker_app/screens/profile_setup/worker_profile_setup_screen.dart';

import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:worker_app/l10n/worker_localizations.dart';
import 'package:worker_app/providers/worker_language_provider.dart';

Widget _createTestWidget(Widget child, {WorkerBookingProvider? bookingProvider}) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => WorkerLanguageProvider()),
      ChangeNotifierProvider(create: (_) => WorkerAuthProvider()),
      ChangeNotifierProvider(create: (_) => WorkerProfileProvider()),
      ChangeNotifierProvider(create: (_) => bookingProvider ?? WorkerBookingProvider()),
      ChangeNotifierProvider(create: (_) => WorkerEarningsProvider()),
    ],
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      locale: const Locale('en'),
      supportedLocales: WorkerLanguageProvider.supportedLocales,
      localizationsDelegates: const [
        WorkerLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: child,
    ),
  );
}

void main() {
  testWidgets('1. Worker Login Screen renders phone input and send OTP button', (WidgetTester tester) async {
    await tester.pumpWidget(_createTestWidget(const WorkerLoginScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Sahkar Sewa'), findsOneWidget);
    expect(find.text('Federation Worker Login'), findsOneWidget);
    expect(find.text('MOBILE NUMBER'), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
  });

  testWidgets('2. Worker OTP Screen renders 6 PIN boxes and verify button', (WidgetTester tester) async {
    await tester.pumpWidget(_createTestWidget(const WorkerOtpScreen(phoneNumber: '+919876543210')));
    await tester.pumpAndSettle();
    expect(find.text('Verify Your Number'), findsOneWidget);
    expect(find.text('+919876543210'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(6));
    expect(find.text('Verify & Continue'), findsOneWidget);
  });

  testWidgets('3. Worker Dashboard Screen renders availability toggle and overview cards', (WidgetTester tester) async {
    await tester.pumpWidget(_createTestWidget(const WorkerDashboardScreen()));
    await tester.pump();

    expect(find.text('YOU ARE AVAILABLE'), findsOneWidget);
    expect(find.byType(Switch), findsOneWidget);
    expect(find.text("TODAY'S OVERVIEW"), findsOneWidget);
    expect(find.text("Today's Jobs"), findsOneWidget);
    expect(find.text('Rating'), findsOneWidget);
  });

  testWidgets('4. Emergency Request Modal displays emergency header, ASAP, and accept button', (WidgetTester tester) async {
    final provider = WorkerBookingProvider();
    final emergencyBooking = WorkerBooking(
      id: 'emg-test-01',
      shortCode: 'BK1416',
      customerId: 'c-1',
      customerName: 'Priya M.',
      serviceAddress: 'HSR Layout, Sector 2',
      skillCategory: 'electrician',
      status: 'requested',
      scheduledTime: 'immediate',
      isEmergency: true,
      totalAmount: 850.0,
      createdAt: DateTime.now().toIso8601String(),
    );

    await tester.pumpWidget(_createTestWidget(
      EmergencyRequestModal(booking: emergencyBooking),
      bookingProvider: provider,
    ));
    await tester.pump();

    expect(find.text('EMERGENCY REQUEST'), findsOneWidget);
    expect(find.text('Priya M.'), findsOneWidget);
    expect(find.text('ASAP'), findsOneWidget);
    expect(find.text('Accept Job ✓'), findsOneWidget);
    expect(find.text('Decline'), findsOneWidget);

    provider.clearEmergencyTimer();
  });

  testWidgets('5. Job Request Details Screen renders breakdown and schedule', (WidgetTester tester) async {
    final booking = WorkerBooking(
      id: 'bk-test-01',
      shortCode: 'BK7800',
      customerId: 'c-2',
      customerName: 'Rahul Sharma',
      serviceAddress: 'Palm Grove Apartments',
      skillCategory: 'electrician',
      status: 'requested',
      scheduledTime: 'Today, 2:30 PM',
      totalAmount: 650.0,
      createdAt: DateTime.now().toIso8601String(),
    );

    await tester.pumpWidget(_createTestWidget(JobRequestDetailsScreen(booking: booking)));
    await tester.pump();

    expect(find.text('Job Request'), findsOneWidget);
    expect(find.text('Rahul Sharma'), findsOneWidget);
    expect(find.text('ESTIMATED EARNINGS'), findsOneWidget);
    expect(find.text('Accept Job ✓'), findsOneWidget);
  });

  testWidgets('6. Active Job Screen displays stepper, navigation, and advance button', (WidgetTester tester) async {
    final activeBooking = WorkerBooking(
      id: 'bk-act-01',
      shortCode: 'BK9021',
      customerId: 'c-3',
      customerName: 'Sarah Jenkins',
      serviceAddress: '4820 Skyline Blvd',
      skillCategory: 'electrician',
      status: 'arriving',
      scheduledTime: 'immediate',
      totalAmount: 850.0,
      createdAt: DateTime.now().toIso8601String(),
    );

    await tester.pumpWidget(_createTestWidget(ActiveJobScreen(booking: activeBooking)));
    await tester.pump();

    expect(find.text('Active Job'), findsOneWidget);
    expect(find.text('Sarah Jenkins'), findsOneWidget);
    expect(find.text('Start Navigation'), findsOneWidget);
    expect(find.text("I've Arrived"), findsOneWidget);
  });

  testWidgets('7. Customer Communication Screen renders call, message, and customer notes', (WidgetTester tester) async {
    final activeBooking = WorkerBooking(
      id: 'bk-act-02',
      shortCode: 'BK9022',
      customerId: 'c-4',
      customerName: 'Sarah Jenkins',
      serviceAddress: '1234 Maple Street, Apt 4B',
      skillCategory: 'electrician',
      status: 'arriving',
      scheduledTime: 'Today, 2:00 PM - 5:00 PM',
      totalAmount: 850.0,
      customerNote: 'Main gate is on the left side of the driveway.',
      createdAt: DateTime.now().toIso8601String(),
    );

    await tester.pumpWidget(_createTestWidget(CustomerCommunicationScreen(booking: activeBooking)));
    await tester.pump();

    expect(find.text('Customer Details'), findsOneWidget);
    expect(find.text('Sarah Jenkins'), findsOneWidget);
    expect(find.text('CALL CUSTOMER'), findsOneWidget);
    expect(find.text('IN-APP CHAT'), findsOneWidget);
    expect(find.text('START NAVIGATION'), findsOneWidget);
    expect(find.text('CUSTOMER NOTE'), findsOneWidget);
  });

  testWidgets('8. Complete Service Screen renders breakdown and add parts button', (WidgetTester tester) async {
    final booking = WorkerBooking(
      id: 'bk-comp-01',
      shortCode: 'BK9021',
      customerId: 'c-3',
      customerName: 'Sarah Jenkins',
      serviceAddress: '4820 Skyline Blvd',
      skillCategory: 'electrician',
      status: 'in_progress',
      scheduledTime: 'immediate',
      laborRate: 850.0,
      totalAmount: 850.0,
      createdAt: DateTime.now().toIso8601String(),
    );

    await tester.pumpWidget(_createTestWidget(CompleteServiceScreen(booking: booking)));
    await tester.pump();

    expect(find.text('Complete Service'), findsNWidgets(2));
    expect(find.text('WORKER EARNINGS'), findsOneWidget);
    expect(find.text('BILLING BREAKDOWN'), findsOneWidget);
    expect(find.text('+ ADD PARTS'), findsOneWidget);
  });

  testWidgets('9. Worker Earnings Screen renders weekly bar chart and welfare fund', (WidgetTester tester) async {
    await tester.pumpWidget(_createTestWidget(const WorkerEarningsScreen()));
    await tester.pump();

    expect(find.text('WEEK EARNINGS'), findsOneWidget);
    expect(find.text('Welfare Fund'), findsOneWidget);
    expect(find.text('Withdraw to Bank'), findsOneWidget);
    expect(find.text('Recent Jobs'), findsOneWidget);
  });

  testWidgets('10. Job History Screen renders tabs for All, Pending, Active, Completed, Emergency', (WidgetTester tester) async {
    await tester.pumpWidget(_createTestWidget(const JobHistoryScreen()));
    await tester.pump();

    expect(find.text('My Jobs'), findsOneWidget);
    expect(find.text('All'), findsOneWidget);
    expect(find.text('Pending'), findsOneWidget);
    expect(find.text('Active'), findsOneWidget);
    expect(find.text('Completed'), findsOneWidget);
    expect(find.text('Emergency'), findsOneWidget);
  });

  testWidgets('11. Worker Profile Screen renders photo, stats, specialties, and certifications', (WidgetTester tester) async {
    await tester.pumpWidget(_createTestWidget(const WorkerProfileScreen()));
    await tester.pump();

    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('Edit Profile'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Availability'), findsOneWidget);
    expect(find.text('Specialties'), findsOneWidget);
    expect(find.text('Certifications'), findsOneWidget);
  });

  testWidgets('12. Worker Settings Screen renders emergency toggle, language, and logout', (WidgetTester tester) async {
    await tester.pumpWidget(_createTestWidget(const WorkerSettingsScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Accept Emergency Requests'), findsOneWidget);
    expect(find.text('Language'), findsOneWidget);
    expect(find.text('Alert Voice'), findsOneWidget);
    expect(find.text('Log Out'), findsOneWidget);
  });

  testWidgets('13. Worker Profile Setup Screen renders 3-step partner registration', (WidgetTester tester) async {
    await tester.pumpWidget(_createTestWidget(const WorkerProfileSetupScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Independent Partner Setup'), findsOneWidget);
    expect(find.text('Personal Details & Location'), findsOneWidget);
    expect(find.text('Continue →'), findsOneWidget);
  });

  testWidgets('14. Worker Main Screen renders 5 bottom tabs', (WidgetTester tester) async {
    await tester.pumpWidget(_createTestWidget(const WorkerMainScreen()));
    await tester.pump();

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Jobs'), findsOneWidget);
    expect(find.text('Alerts'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });
}

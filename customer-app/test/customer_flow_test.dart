import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:customer_app/config/theme.dart';
import 'package:customer_app/l10n/app_localizations.dart';
import 'package:customer_app/models/booking_model.dart';
import 'package:customer_app/models/payment_model.dart';
import 'package:customer_app/models/worker_model.dart';
import 'package:customer_app/providers/auth_provider.dart';
import 'package:customer_app/providers/booking_provider.dart';
import 'package:customer_app/providers/customer_provider.dart';
import 'package:customer_app/providers/language_provider.dart';
import 'package:customer_app/screens/auth/otp_verify_screen.dart';
import 'package:customer_app/screens/auth/phone_auth_screen.dart';
import 'package:customer_app/screens/booking/booking_details_screen.dart';
import 'package:customer_app/screens/booking/booking_status_screen.dart';
import 'package:customer_app/screens/booking/create_booking_screen.dart';
import 'package:customer_app/screens/booking/my_bookings_screen.dart';
import 'package:customer_app/screens/home/home_screen.dart';
import 'package:customer_app/screens/payment/payment_invoice_screen.dart';
import 'package:customer_app/screens/payment/service_receipt_screen.dart';
import 'package:customer_app/screens/profile/profile_setup_screen.dart';
import 'package:customer_app/screens/profile/settings_screen.dart';
import 'package:customer_app/screens/profile/user_profile_screen.dart';
import 'package:customer_app/screens/rating/rating_feedback_screen.dart';
import 'package:customer_app/screens/worker/worker_profile_screen.dart';
import 'package:customer_app/screens/worker/worker_search_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget createTestApp(Widget child) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => LanguageProvider()),
      ChangeNotifierProvider(create: (_) => AuthProvider()),
      ChangeNotifierProvider(create: (_) => CustomerProvider()),
      ChangeNotifierProvider(create: (_) => BookingProvider()),
    ],
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      locale: const Locale('en'),
      supportedLocales: LanguageProvider.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: child,
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  final sampleWorker = WorkerModel(
    id: 'worker-1',
    fullName: 'Marcus Chen',
    skillCategory: 'electrician',
    avgRating: 4.9,
    hourlyRate: 450.0,
    totalJobs: 128,
    distanceKm: 2.4,
  );

  final sampleBooking = BookingModel(
    id: 'booking-1',
    customerId: 'cust-1',
    workerId: 'worker-1',
    workerName: 'Marcus Chen',
    skillCategory: 'electrician',
    status: 'completed',
    scheduledTime: 'Oct 24, 2026 • 09:00 AM',
    serviceAddress: '123 Pine St, Kolkata',
    totalAmount: 1850.0,
    createdAt: DateTime.now().toIso8601String(),
  );

  final samplePayment = PaymentModel(
    id: 'pay-1',
    bookingId: 'booking-1',
    amount: 1850.0,
    platformCommission: 185.0,
    welfareDeduction: 37.0,
    workerPayout: 1628.0,
    status: 'paid',
    razorpayPaymentId: 'pay_mock_123456',
    createdAt: DateTime.now().toIso8601String(),
  );

  testWidgets('1. PhoneAuthScreen renders properly', (tester) async {
    await tester.pumpWidget(createTestApp(const PhoneAuthScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Sahkar Sewa'), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);
  });

  testWidgets('2. OtpVerifyScreen renders properly', (tester) async {
    await tester.pumpWidget(createTestApp(const OtpVerifyScreen(phoneNumber: '+919000011111')));
    await tester.pumpAndSettle();
    expect(find.text('Enter Verification Code'), findsOneWidget);
    expect(find.text('Verify & Proceed'), findsOneWidget);
  });

  testWidgets('3. ProfileSetupScreen renders properly', (tester) async {
    await tester.pumpWidget(createTestApp(const ProfileSetupScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Setup Profile'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
  });

  testWidgets('4. HomeScreen renders categories & navigation properly', (tester) async {
    await tester.pumpWidget(createTestApp(const HomeScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Sahkar Sewa'), findsOneWidget);
    expect(find.text('Categories'), findsOneWidget);
    expect(find.text('Electrician'), findsOneWidget);
  });

  testWidgets('5. WorkerSearchScreen renders properly', (tester) async {
    await tester.pumpWidget(createTestApp(const WorkerSearchScreen(initialCategory: 'plumber')));
    await tester.pumpAndSettle();
    expect(find.text('Plumbers near you'), findsOneWidget);
  });

  testWidgets('6. WorkerProfileScreen renders stats & book button properly', (tester) async {
    await tester.pumpWidget(createTestApp(WorkerProfileScreen(worker: sampleWorker)));
    await tester.pumpAndSettle();
    expect(find.text('Marcus Chen'), findsOneWidget);
    expect(find.text('Book This Professional'), findsOneWidget);
  });

  testWidgets('7. CreateBookingScreen renders time chips & payment breakdown in scheduled mode', (tester) async {
    await tester.pumpWidget(createTestApp(CreateBookingScreen(worker: sampleWorker)));
    await tester.pumpAndSettle();
    expect(find.text('Confirm & Dispatch Booking'), findsNWidgets(2));
    expect(find.text('Schedule for Later'), findsOneWidget);
    expect(find.text('Payment Summary'), findsOneWidget);
  });

  testWidgets('8. BookingStatusScreen renders properly with emergency badge', (tester) async {
    await tester.pumpWidget(createTestApp(BookingStatusScreen(bookingId: sampleBooking.id)));
    await tester.pumpAndSettle();
    expect(find.text('Sahkar Sewa'), findsOneWidget);
  });

  testWidgets('9. PaymentInvoiceScreen renders itemized bill properly', (tester) async {
    await tester.pumpWidget(createTestApp(PaymentInvoiceScreen(booking: sampleBooking)));
    await tester.pumpAndSettle();
    expect(find.text('Service Invoice'), findsOneWidget);
    expect(find.text('Labor Charge (2h)'), findsOneWidget);
  });

  testWidgets('10. ServiceReceiptScreen renders in INR properly', (tester) async {
    await tester.pumpWidget(createTestApp(ServiceReceiptScreen(booking: sampleBooking, payment: samplePayment)));
    await tester.pumpAndSettle();
    expect(find.text('VIEW TAX RECEIPT'), findsOneWidget);
    expect(find.text('Download Receipt'), findsOneWidget);
  });

  testWidgets('11. RatingFeedbackScreen renders stars & tags properly', (tester) async {
    await tester.pumpWidget(createTestApp(RatingFeedbackScreen(booking: sampleBooking)));
    await tester.pumpAndSettle();
    expect(find.text('Submit Feedback'), findsOneWidget);
    expect(find.text('Punctual'), findsOneWidget);
  });

  testWidgets('12. MyBookingsScreen renders filters properly', (tester) async {
    await tester.pumpWidget(createTestApp(const MyBookingsScreen()));
    await tester.pumpAndSettle();
    expect(find.text('My Bookings'), findsOneWidget);
    expect(find.text('All'), findsOneWidget);
  });

  testWidgets('13. BookingDetailsScreen renders journey properly', (tester) async {
    await tester.pumpWidget(createTestApp(BookingDetailsScreen(bookingId: sampleBooking.id)));
    await tester.pumpAndSettle();
    expect(find.text('Booking Details'), findsOneWidget);
  });

  testWidgets('14. UserProfileScreen renders navigation list properly', (tester) async {
    await tester.pumpWidget(createTestApp(const UserProfileScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Edit Profile'), findsOneWidget);
    expect(find.text('Log Out'), findsOneWidget);
  });

  testWidgets('15. SettingsScreen renders preferences properly', (tester) async {
    await tester.pumpWidget(createTestApp(const SettingsScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Alert Voice'), findsOneWidget);
    expect(find.text('Language'), findsOneWidget);
  });
}

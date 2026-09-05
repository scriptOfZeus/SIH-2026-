import 'package:intl/intl.dart';

/// Centralized Indian Rupee (INR / ₹) currency formatter.
/// Ensures that no USD or dollar signs ever appear in the application.
class CurrencyFormatter {
  static final NumberFormat _inrFormat = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );

  static final NumberFormat _inrDecimalFormat = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 2,
  );

  /// Format whole numbers or standard amounts: e.g. ₹500, ₹1,250
  static String format(num amount) {
    if (amount % 1 == 0) {
      return _inrFormat.format(amount);
    }
    return _inrDecimalFormat.format(amount);
  }

  /// Format with explicit decimal places: e.g. ₹120.00, ₹1,770.80
  static String formatWithDecimals(num amount) {
    return _inrDecimalFormat.format(amount);
  }

  /// Format hourly rate: e.g. ₹450/hr
  static String formatRate(num amount) {
    return '${format(amount)}/hr';
  }
}

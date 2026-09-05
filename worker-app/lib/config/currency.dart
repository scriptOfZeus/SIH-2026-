import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final NumberFormat _inrFormat = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );

  static final NumberFormat _inrWithDecimals = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 2,
  );

  static String format(num amount) {
    return _inrFormat.format(amount);
  }

  static String formatWithDecimals(num amount) {
    return _inrWithDecimals.format(amount);
  }

  static String formatRate(num hourlyRate) {
    return '${format(hourlyRate)}/hr';
  }
}

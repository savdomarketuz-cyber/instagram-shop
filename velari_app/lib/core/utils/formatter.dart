import 'package:intl/intl.dart';

class Formatter {
  Formatter._();

  static String formatPrice(double price, String lang) {
    final formatter = NumberFormat('#,###', 'uz_UZ');
    final formattedValue = formatter.format(price).replaceAll(',', ' ');
    
    if (lang == 'ru') {
      return '$formattedValue сум';
    }
    return '$formattedValue soʻm';
  }
}


class DeliveryCalculator {
  DeliveryCalculator._();

  static Map<String, dynamic> _getDbsConfig(Map<String, dynamic>? stockDetails, List<Map<String, dynamic>> warehouses) {
    final stockEntries = stockDetails?.entries ?? [];
    final whEntry = stockEntries.firstWhere(
      (e) => (int.tryParse(e.value.toString()) ?? 0) > 0,
      orElse: () => stockEntries.isNotEmpty ? stockEntries.first : const MapEntry('', 0),
    );
    final String whId = whEntry.key;

    final warehouse = warehouses.firstWhere(
      (w) => w['id']?.toString() == whId,
      orElse: () => warehouses.isNotEmpty ? warehouses.first : <String, dynamic>{},
    );

    final dbs = warehouse['dbs_config'] is Map ? warehouse['dbs_config'] as Map : {};
    return {
      'cutoff': int.tryParse(dbs['cutoffHour']?.toString() ?? '16') ?? 16,
      'days': int.tryParse(dbs['deliveryDays']?.toString() ?? '1') ?? 1,
      'offDays': dbs['offDays'] is List ? List<int>.from((dbs['offDays'] as List).map((x) => int.tryParse(x.toString()) ?? 0)) : <int>[],
      'holidays': dbs['holidays'] is List ? List<String>.from((dbs['holidays'] as List).map((x) => x.toString())) : <String>[],
    };
  }

  static DateTime _calculateDeliveryDate(Map<String, dynamic> config) {
    final cutoff = config['cutoff'] as int;
    final deliveryDays = config['days'] as int;
    final offDays = config['offDays'] as List<int>;
    final holidays = config['holidays'] as List<String>;

    final now = DateTime.now();
    int daysToAdd = now.hour >= cutoff ? deliveryDays + 1 : deliveryDays;

    DateTime d = now.add(Duration(days: daysToAdd));

    bool isOff(DateTime date) {
      final y = date.year;
      final m = date.month.toString().padLeft(2, '0');
      final dd = date.day.toString().padLeft(2, '0');
      final jsDay = date.weekday % 7; // Sunday=0, Monday=1, ...
      return offDays.contains(jsDay) || holidays.contains('$y-$m-$dd');
    }

    int iterations = 0;
    while (isOff(d) && iterations < 30) {
      d = d.add(const Duration(days: 1));
      iterations++;
    }
    return d;
  }

  static String getDeliveryCardText(String lang, Map<String, dynamic>? stockDetails, List<Map<String, dynamic>> warehouses) {
    final config = _getDbsConfig(stockDetails, warehouses);
    final d = _calculateDeliveryDate(config);
    final now = DateTime.now();

    final todayStart = DateTime(now.year, now.month, now.day);
    final targetStart = DateTime(d.year, d.month, d.day);
    final diffDays = targetStart.difference(todayStart).inDays;

    if (lang == 'ru') {
      if (diffDays <= 0) return "Сегодня";
      if (diffDays == 1) return "Завтра";
      if (diffDays == 2) return "Послезавтра";
      const monthsRu = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
      return "${d.day} ${monthsRu[d.month - 1]}";
    } else {
      if (diffDays <= 0) return "Bugun";
      if (diffDays == 1) return "Ertaga";
      if (diffDays == 2) return "Indinga";
      const monthsUz = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];
      return "${d.day}-${monthsUz[d.month - 1]}da";
    }
  }

  static String getDeliveryDateText(String lang, Map<String, dynamic>? stockDetails, List<Map<String, dynamic>> warehouses) {
    final config = _getDbsConfig(stockDetails, warehouses);
    final d = _calculateDeliveryDate(config);
    final now = DateTime.now();

    final todayStart = DateTime(now.year, now.month, now.day);
    final targetStart = DateTime(d.year, d.month, d.day);
    final diffDays = targetStart.difference(todayStart).inDays;

    final months = lang == 'uz' 
        ? ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"] 
        : ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    
    final dayName = d.day;
    final monthName = months[d.month - 1];

    if (diffDays <= 0) {
      return lang == 'uz' ? "Bugun" : "Сегодня";
    }
    if (diffDays == 1) {
      return lang == 'uz' ? "Ertaga, $dayName-$monthName" : "Завтра, $dayName-$monthName";
    }
    if (diffDays == 2) {
      return lang == 'uz' ? "Indinga, $dayName-$monthName" : "Послезавтра, $dayName-$monthName";
    }
    return "$dayName-$monthName";
  }
}

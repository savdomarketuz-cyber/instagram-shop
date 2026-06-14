import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  print('Initializing Supabase...');
  await Supabase.initialize(
    url: 'https://slmbethqqqugnktxwzdz.supabase.co',
    anonKey: 'sb_publishable_C4dWn3_2g3Oj31w57RiBBQ_EQZIeCXK',
  );

  final client = Supabase.instance.client;
  print('Fetching products...');
  try {
    final response = await client
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .gt('stock', 0)
        .order('created_at', ascending: false)
        .range(0, 19);

    print('Response is List: ${response is List}');
    print('Products fetched: ${response.length}');
    if (response is List && response.isNotEmpty) {
      print('First product keys: ${response.first.keys}');
      print('First product name: ${response.first['name']}');
    }
  } catch (e) {
    print('Error: $e');
  }
}

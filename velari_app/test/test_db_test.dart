import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class TestLocalStorage extends LocalStorage {
  const TestLocalStorage();

  @override
  Future<void> initialize() async {}

  @override
  Future<String?> accessToken() async => null;

  @override
  Future<bool> hasAccessToken() async => false;

  @override
  Future<void> persistSession(String session) async {}

  @override
  Future<void> removePersistedSession() async {}
}

void main() {
  test('Test Supabase Query', () async {
    print('Initializing Supabase...');
    await Supabase.initialize(
      url: 'https://slmbethqqqugnktxwzdz.supabase.co',
      anonKey: 'sb_publishable_C4dWn3_2g3Oj31w57RiBBQ_EQZIeCXK',
      authOptions: const FlutterAuthClientOptions(
        localStorage: TestLocalStorage(),
      ),
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

      print('Products fetched: ${response.length}');
      if (response is List && response.isNotEmpty) {
        print('First product keys: ${response.first.keys}');
        print('First product name: ${response.first['name']}');
      }
    } catch (e) {
      print('Error: $e');
    }
  });
}

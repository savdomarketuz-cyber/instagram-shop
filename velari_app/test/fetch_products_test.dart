import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:velari_app/core/api/data_repository.dart';
import 'package:velari_app/core/api/api_client.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

void main() {
  test('Fetch products and parse', () async {
    await dotenv.load(fileName: "d:/Desktop/asosiy dasturlar/instagram shop/.env.local");
    final supabaseUrl = dotenv.env['NEXT_PUBLIC_SUPABASE_URL']!;
    final supabaseKey = dotenv.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!;
    
    final supabase = SupabaseClient(supabaseUrl, supabaseKey);
    final apiClient = ApiClient();
    final repo = DataRepository(supabase: supabase, apiClient: apiClient);
    
    print('Fetching products...');
    final products = await repo.fetchProducts();
    print('Fetched ${products.length} products.');
    if (products.isEmpty) {
      print('Last products error: ${repo.lastProductsError}');
    }
  });
}

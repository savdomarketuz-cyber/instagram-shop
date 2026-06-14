import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SupabaseConfig {
  static const String url = 'https://slmbethqqqugnktxwzdz.supabase.co';
  static const String anonKey = 'sb_publishable_C4dWn3_2g3Oj31w57RiBBQ_EQZIeCXK';
}

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

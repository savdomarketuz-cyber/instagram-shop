import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hive_ce/hive_ce.dart';
import 'package:path_provider/path_provider.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'core/api/api_client.dart';
import 'core/supabase/supabase_client.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialize Hive DB (local cache)
  final appDocumentDir = await getApplicationDocumentsDirectory();
  Hive.init(appDocumentDir.path);
  
  // Open necessary Hive boxes for settings, local cart, wishlist, etc.
  await Hive.openBox('settings');
  await Hive.openBox('cart');
  await Hive.openBox('wishlist');

  // 2. Initialize Supabase
  await Supabase.initialize(
    url: SupabaseConfig.url,
    publishableKey: SupabaseConfig.anonKey,
  );

  // 3. Initialize Persistent Cookie Jar
  final cookieJar = PersistCookieJar(
    storage: FileStorage('${appDocumentDir.path}/.cookies/'),
  );

  runApp(
    ProviderScope(
      overrides: [
        cookieJarProvider.overrideWithValue(cookieJar),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Velari',
      theme: AppTheme.lightTheme,
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      scaffoldMessengerKey: globalMessengerKey,
    );
  }
}

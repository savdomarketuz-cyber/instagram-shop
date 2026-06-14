import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Global Key for showing Toasts/SnackBars from anywhere in the app without context
final globalMessengerKey = GlobalKey<ScaffoldMessengerState>();

class ApiClient {
  final Dio dio;
  final PersistCookieJar cookieJar;

  ApiClient({required this.dio, required this.cookieJar}) {
    _initInterceptors();
  }

  void _initInterceptors() {
    // Add Cookie Manager for persistent session support matching Next.js HttpOnly auth
    dio.interceptors.add(CookieManager(cookieJar));

    // Logging & Custom Error Handling Interceptor
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          debugPrint('API REQUEST [${options.method}] => PATH: ${options.path}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          debugPrint('API RESPONSE [${response.statusCode}] => PATH: ${response.requestOptions.path}');
          return handler.next(response);
        },
        onError: (DioException e, handler) {
          debugPrint('API ERROR [${e.response?.statusCode}] => PATH: ${e.requestOptions.path}');
          _handleError(e);
          return handler.next(e);
        },
      ),
    );
  }

  void _handleError(DioException e) {
    String message = "Kutilmagan xatolik yuz berdi";
    
    if (e.type == DioExceptionType.connectionTimeout || 
        e.type == DioExceptionType.receiveTimeout) {
      message = "Serverga ulanish vaqti tugadi. Internet aloqasini tekshiring.";
    } else if (e.response != null) {
      final statusCode = e.response!.statusCode;
      final responseData = e.response!.data;

      if (statusCode == 401) {
        message = "Sessiya muddati tugadi. Iltimos, qaytadan kiring.";
      } else if (statusCode == 429) {
        message = "So'rovlar soni juda ko'p. Iltimos, birozdan so'ng urunib ko'ring.";
      } else if (responseData is Map && responseData.containsKey('message')) {
        message = responseData['message'].toString();
      } else if (responseData is Map && responseData.containsKey('error')) {
        message = responseData['error'].toString();
      } else {
        message = "Xatolik: $statusCode. Iltimos, qaytadan urunib ko'ring.";
      }
    }

    showToast(message, isError: true);
  }

  // Helper to show custom premium-looking snackbar toasts
  static void showToast(String message, {bool isError = false}) {
    final state = globalMessengerKey.currentState;
    if (state == null) return;

    state.clearSnackBars();
    state.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: Colors.white,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF2D6E3E),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        duration: const Duration(seconds: 3),
      ),
    );
  }
}

// Riverpod Providers
final apiBaseUrlProvider = Provider<String>((ref) {
  return "https://velari.uz";
});

final cookieJarProvider = Provider<PersistCookieJar>((ref) {
  throw UnimplementedError('cookieJarProvider must be overridden in main.dart');
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final baseUrl = ref.watch(apiBaseUrlProvider);
  final cookieJar = ref.watch(cookieJarProvider);
  
  final dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  ));

  return ApiClient(dio: dio, cookieJar: cookieJar);
});

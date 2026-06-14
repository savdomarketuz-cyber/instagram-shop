import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive_ce.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/user.dart';

class AuthNotifier extends StateNotifier<User?> {
  final Box _settingsBox;
  final ApiClient _apiClient;

  AuthNotifier(this._settingsBox, this._apiClient) : super(null) {
    _loadUser();
  }

  void _loadUser() {
    final userJson = _settingsBox.get('user');
    if (userJson != null) {
      try {
        final Map<String, dynamic> map = jsonDecode(userJson.toString()) as Map<String, dynamic>;
        state = User.fromJson(map);
      } catch (_) {
        state = null;
      }
    }
  }

  Future<bool> login(String phone, String password) async {
    try {
      // Clean phone number format
      String cleanPhone = phone.replaceAll(RegExp(r'\s+'), '').replaceAll('+', '');
      if (!cleanPhone.startsWith('998') && cleanPhone.length == 9) {
        cleanPhone = '998$cleanPhone';
      }
      cleanPhone = '+$cleanPhone';

      final response = await _apiClient.dio.post('/api/auth/user', data: {
        'phone': cleanPhone,
        'password': password,
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (data['success'] == true && data['user'] != null) {
          final user = User.fromJson(data['user'] as Map<String, dynamic>);
          state = user;
          await _settingsBox.put('user', jsonEncode(user.toJson()));
          
          // Show welcome toast
          ApiClient.showToast(
            user.isAdmin ? "Xush kelibsiz, Admin!" : "Xush kelibsiz!",
            isError: false,
          );
          return true;
        }
      }
      return false;
    } catch (e) {
      // Errors are already handled by ApiClient interceptor toast
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _apiClient.dio.post('/api/auth/logout');
    } catch (_) {}
    state = null;
    await _settingsBox.delete('user');
    await _apiClient.cookieJar.deleteAll();
    ApiClient.showToast("Tizimdan chiqildi", isError: false);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, User?>((ref) {
  final settingsBox = Hive.box('settings');
  final apiClient = ref.watch(apiClientProvider);
  return AuthNotifier(settingsBox, apiClient);
});

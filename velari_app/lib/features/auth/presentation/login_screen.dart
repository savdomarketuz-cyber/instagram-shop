import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  final String? redirect;

  const LoginScreen({
    super.key,
    this.redirect,
  });

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final phone = _phoneController.text.trim();
    final password = _passwordController.text.trim();

    if (phone.isEmpty || password.isEmpty) {
      setState(() {
        _error = ref.read(localeProvider) == 'ru'
            ? 'Заполните все поля'
            : 'Barcha maydonlarni toʻldiring';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final success = await ref.read(authProvider.notifier).login(phone, password);

    if (mounted) {
      setState(() => _isLoading = false);
      if (success) {
        if (widget.redirect != null && widget.redirect!.isNotEmpty) {
          context.go(widget.redirect!);
        } else {
          context.go('/profile');
        }
      } else {
        setState(() {
          _error = ref.read(localeProvider) == 'ru'
              ? 'Неверный номер телефона или пароль'
              : 'Telefon raqami yoki parol notoʻgʻri';
        });
      }
    }
  }

  Future<void> _launchTelegramBot() async {
    const botUsername = "velari_uz_xabarnoma_bot";
    final url = Uri.parse("https://t.me/$botUsername?start=register");
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Telegram topilmadi")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppTheme.textPrimaryColor,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo/Icon
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF3EC),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: const Icon(Icons.person_outline, size: 36, color: AppTheme.primaryColor),
              ),
              const SizedBox(height: 18),
              // Titles
              Text(
                lang == 'ru' ? 'Войдите в Velari' : "Velari'ga kiring",
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimaryColor,
                  letterSpacing: -0.6,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                lang == 'ru' ? 'Введите телефон и пароль' : 'Telefon va parolingizni kiriting',
                style: const TextStyle(fontSize: 15, color: AppTheme.textSecondaryColor),
              ),
              const SizedBox(height: 28),
              // Form
              Column(
                children: [
                  // Phone Number Input
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Row(
                      children: [
                        const Text(
                          '🇺🇿 +998',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              hintText: '90 123 45 67',
                              border: InputBorder.none,
                            ),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Password Input
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: TextField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: InputDecoration(
                        hintText: lang == 'ru' ? 'Пароль' : 'Parol',
                        border: InputBorder.none,
                      ),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF0EE),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
                      ),
                      width: double.infinity,
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Color(0xFFEF4444), fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  const SizedBox(height: 16),
                  // Submit
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                        elevation: 0,
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                            )
                          : Text(
                              lang == 'ru' ? 'Войти' : 'Kirish',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // Privacy disclaimer
              Text(
                lang == 'ru'
                    ? 'Продолжая, вы соглашаетесь с условиями использования и политикой конфиденциальности Velari'
                    : 'Davom etish bilan siz Velari foydalanish shartlari va maxfiylik siyosatiga rozilik bildirasiz',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 11, height: 1.4),
              ),
              const SizedBox(height: 32),
              // Telegram register section
              Row(
                children: [
                  Expanded(child: Divider(color: Colors.grey.shade200)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      lang == 'ru' ? 'Новый пользователь' : 'Yangi foydalanuvchi',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                    ),
                  ),
                  Expanded(child: Divider(color: Colors.grey.shade200)),
                ],
              ),
              const SizedBox(height: 20),
              // Telegram Register Button
              InkWell(
                onTap: _launchTelegramBot,
                borderRadius: BorderRadius.circular(22),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2299D9), Color(0xFF1D88C2)],
                    ),
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Telegram orqali',
                              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Tezkor roʻyxatdan oʻtish',
                              style: TextStyle(fontSize: 12, color: Colors.white70),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.send, color: Colors.white, size: 20),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

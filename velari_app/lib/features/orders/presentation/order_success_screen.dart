import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';

class OrderSuccessScreen extends ConsumerWidget {
  final String orderId;

  const OrderSuccessScreen({
    super.key,
    required this.orderId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(localeProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Animated Success Checkbox Icon
              Container(
                width: 90,
                height: 90,
                decoration: const BoxDecoration(
                  color: Color(0xFFEAF3EC),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_outline,
                  color: AppTheme.primaryColor,
                  size: 54,
                ),
              )
                  .animate()
                  .scale(duration: 500.ms, curve: Curves.elasticOut)
                  .then()
                  .shake(duration: 300.ms),
              const SizedBox(height: 28),
              // Success titles
              Text(
                lang == 'ru' ? 'Заказ оформлен!' : "Buyurtma qabul qilindi!",
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.textPrimaryColor,
                  letterSpacing: -0.5,
                ),
              ).animate().fade(delay: 200.ms).slideY(begin: 0.2),
              const SizedBox(height: 12),
              Text(
                lang == 'ru'
                    ? 'Спасибо за покупку. Скоро наш менеджер свяжется с вами.'
                    : 'Xaridingiz uchun rahmat. Tez orada menejerimiz siz bilan bogʻlanadi.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondaryColor,
                  height: 1.4,
                ),
              ).animate().fade(delay: 300.ms).slideY(begin: 0.2),
              const SizedBox(height: 36),
              // Order info card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Text(
                      lang == 'ru' ? 'НОМЕР ЗАКАЗА' : 'BUYURTMA RAQAMI',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade400,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          orderId,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textPrimaryColor,
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.copy, size: 18, color: AppTheme.primaryColor),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: orderId));
                            ApiClient.showToast(
                              lang == 'ru' ? "Номер заказа скопирован" : "Buyurtma raqami nusxalandi",
                              isError: false,
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().fade(delay: 400.ms).scale(begin: const Offset(0.9, 0.9)),
              const Spacer(),
              // Action buttons
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () => context.go('/'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                    elevation: 0,
                  ),
                  child: Text(
                    lang == 'ru' ? 'На главную' : 'Bosh sahifaga qaytish',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: () => context.go('/profile'), // Will contain Order list
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.primaryColor,
                    side: const BorderSide(color: AppTheme.primaryColor, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                  ),
                  child: Text(
                    lang == 'ru' ? 'Мои заказы' : 'Buyurtmalarim',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
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

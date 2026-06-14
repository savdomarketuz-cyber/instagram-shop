import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider);
    final currentLocale = ref.watch(localeProvider);
    final lang = currentLocale;

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        title: Text(context.tr('nav_profile', ref)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppTheme.textPrimaryColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User profile card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.black.withOpacity(0.04)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                  child: const Icon(Icons.person, size: 32, color: AppTheme.primaryColor),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user != null ? user.name : (lang == 'ru' ? 'Гость' : 'Mehmon'),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimaryColor,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user != null ? user.phone : (lang == 'ru' ? 'Войдите в систему' : 'Tizimga kirish kutilmoqda'),
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondaryColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                if (user == null)
                  ElevatedButton(
                    onPressed: () {
                      context.push('/login');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: Text(
                      lang == 'ru' ? 'Войти' : 'Kirish',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          if (user != null) ...[
            // Actions group: Shopping
            _buildSectionHeader(lang == 'ru' ? 'Покупки' : 'Xaridlar'),
            _buildListItem(
              icon: Icons.inventory_2_outlined,
              title: lang == 'ru' ? 'Мои заказы' : 'Mening buyurtmalarim',
              onTap: () => context.push('/orders'),
            ),
            _buildListItem(
              icon: Icons.favorite_border_outlined,
              title: lang == 'ru' ? 'Избранное' : 'Saralangan mahsulotlar',
              onTap: () => context.push('/wishlist'),
            ),
            const SizedBox(height: 16),

            // Actions group: Benefits
            _buildSectionHeader(lang == 'ru' ? 'Выгода' : 'Foyda'),
            _buildListItem(
              icon: Icons.wallet_outlined,
              title: lang == 'ru' ? 'Кэшбэк кошелёк' : 'Keshbek hamyoni',
              onTap: () => context.push('/wallet'),
            ),
            _buildListItem(
              icon: Icons.share_outlined,
              title: lang == 'ru' ? 'Партнёрский кабинет' : 'Hamkorlik kabineti',
              onTap: () => context.push('/affiliate'),
            ),
            const SizedBox(height: 16),
          ],

          // Language selection setting
          _buildSectionHeader(lang == 'ru' ? 'Настройки' : 'Sozlamalar'),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
            elevation: 0,
            color: Colors.white,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text(
                    context.tr('settings_lang', ref),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
                RadioListTile<String>(
                  title: const Text('Oʻzbekcha', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  value: 'uz',
                  groupValue: currentLocale,
                  activeColor: AppTheme.primaryColor,
                  onChanged: (val) {
                    if (val != null) {
                      ref.read(localeProvider.notifier).setLocale(val);
                    }
                  },
                ),
                RadioListTile<String>(
                  title: const Text('Русский', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  value: 'ru',
                  groupValue: currentLocale,
                  activeColor: AppTheme.primaryColor,
                  onChanged: (val) {
                    if (val != null) {
                      ref.read(localeProvider.notifier).setLocale(val);
                    }
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Actions group: Others
          _buildSectionHeader(lang == 'ru' ? 'Прочее' : 'Boshqalar'),
          _buildListItem(
            icon: Icons.help_outline,
            title: lang == 'ru' ? 'Служба поддержки' : 'Yordam markazi',
            onTap: () => context.push('/chat'),
          ),
          _buildListItem(
            icon: Icons.info_outline,
            title: lang == 'ru' ? 'О нас' : 'Biz haqimizda',
            onTap: () => _showAboutUsDialog(context, lang),
          ),
          const SizedBox(height: 24),

          // Logout button
          if (user != null)
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () {
                  ref.read(authProvider.notifier).logout();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFF0EE),
                  foregroundColor: const Color(0xFFEF4444),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Text(
                  lang == 'ru' ? 'Выйти из системы' : 'Tizimdan chiqish',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ),
          const SizedBox(height: 32),
          
          // App info
          const Center(
            child: Text(
              'Velari v1.0.0 (Native)',
              style: TextStyle(
                color: AppTheme.textSecondaryColor,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 8, bottom: 8, top: 4),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: AppTheme.textSecondaryColor,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildListItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      color: Colors.white,
      child: ListTile(
        leading: Icon(icon, color: AppTheme.primaryColor),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.textPrimaryColor),
        ),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: onTap,
      ),
    );
  }

  void _showAboutUsDialog(BuildContext context, String lang) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text(lang == 'ru' ? 'О нас' : 'Biz haqimizda'),
        content: Text(
          lang == 'ru'
              ? 'Velari — это современный интернет-магазин электроники, основанный в Узбекистане. Мы предлагаем качественные смартфоны, гаджеты и аксессуары по справедливым ценам с гарантией на 1 год.'
              : 'Velari — Oʻzbekistonda tashkil etilgan zamonaviy internet-doʻkon. Biz sifatli smartfonlar, gadjetlar va aksessuarlarni adolatli narxlarda va 1 yillik rasmiy kafolat bilan taklif etamiz.',
          style: const TextStyle(height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

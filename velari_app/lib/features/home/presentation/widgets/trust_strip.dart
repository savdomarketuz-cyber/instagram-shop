import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class TrustStrip extends StatelessWidget {
  final String language;

  const TrustStrip({super.key, required this.language});

  @override
  Widget build(BuildContext context) {
    final isUz = language == 'uz';
    
    final items = [
      {
        'icon': Icons.verified_user_outlined,
        'title': isUz ? 'Kafolatlangan sifat' : 'Гарантия качества',
        'desc': isUz ? 'Faqat original tovarlar' : 'Только оригинальные товары',
      },
      {
        'icon': Icons.swap_horizontal_circle_outlined,
        'title': isUz ? 'Oson qaytarish' : 'Простой возврат',
        'desc': isUz ? '10 kun ichida qaytarish' : 'Возврат в течение 10 дней',
      },
      {
        'icon': Icons.local_shipping_outlined,
        'title': isUz ? 'Tezkor yetkazish' : 'Быстрая доставка',
        'desc': isUz ? 'Butun Oʻzbekiston boʻylab' : 'По всему Узбекистану',
      },
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: items.map((item) {
          final isLast = items.indexOf(item) == items.length - 1;
          
          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Icon(item['icon'] as IconData, color: AppTheme.primaryColor, size: 24),
                      const SizedBox(height: 6),
                      Text(
                        item['title'] as String,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimaryColor,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item['desc'] as String,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 8,
                          color: AppTheme.textSecondaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!isLast)
                  Container(
                    height: 40,
                    width: 1,
                    color: Colors.grey.shade100,
                  ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

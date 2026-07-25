import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class CatalogSortSheet extends StatelessWidget {
  final String lang;
  final String currentSort;
  final ValueChanged<String> onSelect;

  const CatalogSortSheet({
    super.key,
    required this.lang,
    required this.currentSort,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final isUz = lang == 'uz';
    final options = [
      {'key': 'popular', 'title': isUz ? 'Mashhurligi' : 'По популярности'},
      {'key': 'new', 'title': isUz ? 'Yangilari' : 'Новинки'},
      {'key': 'price_asc', 'title': isUz ? 'Arzondan qimmatga' : 'Сначала дешёвые'},
      {'key': 'price_desc', 'title': isUz ? 'Qimmatdan arzonga' : 'Сначала дорогие'},
      {'key': 'rating', 'title': isUz ? 'Reyting bo\'yicha' : 'По рейтингу'},
    ];

    return Container(
      padding: const EdgeInsets.only(bottom: 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            isUz ? 'Saralash' : 'Сортировка',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimaryColor,
            ),
          ),
          const SizedBox(height: 16),
          ...options.map((opt) {
            final key = opt['key'] as String;
            final title = opt['title'] as String;
            final isSelected = key == currentSort;

            return InkWell(
              onTap: () {
                onSelect(key);
                Navigator.pop(context);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected ? AppTheme.primaryColor : AppTheme.textPrimaryColor,
                        ),
                      ),
                    ),
                    if (isSelected)
                      const Icon(Icons.check_circle, color: AppTheme.primaryColor),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

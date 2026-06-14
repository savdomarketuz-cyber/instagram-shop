import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/category.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/localization.dart';

class CategoryFilter extends ConsumerWidget {
  final List<Category> allCategories;
  final String activeFilter;
  final Function(String) setActiveFilter;
  final String activeParent;
  final Function(String) setActiveParent;
  final String language;
  final dynamic translations;
  final Function(String) setHomeActiveFilter;

  const CategoryFilter({
    super.key,
    required this.allCategories,
    required this.activeFilter,
    required this.setActiveFilter,
    required this.activeParent,
    required this.setActiveParent,
    required this.language,
    this.translations,
    required this.setHomeActiveFilter,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Top level/parent categories (those where parentId is null or empty)
    final parentCategories = allCategories.where((c) => c.parentId == null || c.parentId!.isEmpty).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Main categories list
        SizedBox(
          height: 48,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: parentCategories.length + 1,
            itemBuilder: (context, index) {
              final isAll = index == 0;
              final category = isAll ? null : parentCategories[index - 1];
              final categoryId = isAll ? 'all' : category!.id;
              final name = isAll
                  ? (language == 'ru' ? 'Все' : 'Barchasi')
                  : category!.getLocalizedName(language);
              
              final isSelected = activeFilter == categoryId || activeParent == categoryId;

              return GestureDetector(
                onTap: () {
                  if (isAll) {
                    setActiveFilter('all');
                    setActiveParent('all');
                    setHomeActiveFilter('all');
                  } else {
                    setActiveParent(categoryId);
                    setActiveFilter(categoryId);
                    setHomeActiveFilter(categoryId);
                  }
                },
                child: Container(
                  margin: const EdgeInsets.only(right: 10, top: 6, bottom: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.primaryColor : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSelected ? AppTheme.primaryColor : Colors.grey.shade200,
                    ),
                    boxShadow: [
                      if (isSelected)
                        BoxShadow(
                          color: AppTheme.primaryColor.withOpacity(0.2),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    name,
                    style: TextStyle(
                      color: isSelected ? Colors.white : AppTheme.textPrimaryColor,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      fontSize: 13,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

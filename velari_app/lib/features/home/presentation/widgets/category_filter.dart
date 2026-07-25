import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/models/category.dart';
import '../../../../core/theme/app_theme.dart';
import 'package:go_router/go_router.dart';

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
    // Only use top-level categories
    final parentCategories = allCategories.where((c) => c.parentId == null || c.parentId!.isEmpty).toList();

    if (parentCategories.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            language == 'ru' ? 'Категории' : 'Kategoriyalar',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimaryColor,
            ),
          ),
        ),
        SizedBox(
          height: 115,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: parentCategories.length,
            itemBuilder: (context, index) {
              final category = parentCategories[index];
              final categoryId = category.id;
              final name = category.getLocalizedName(language);
              
              final isSelected = activeFilter == categoryId || activeParent == categoryId;

              return GestureDetector(
                onTap: () {
                  context.push('/catalog?categoryId=$categoryId');
                },
                child: Container(
                  width: 85,
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  child: Column(
                    children: [
                      Container(
                        width: 70,
                        height: 70,
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primaryColor.withOpacity(0.1) : Colors.grey.shade100,
                          shape: BoxShape.circle,
                          border: isSelected ? Border.all(color: AppTheme.primaryColor, width: 2) : null,
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: category.icon != null && category.icon!.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: category.icon!,
                                fit: BoxFit.cover,
                                errorWidget: (context, url, error) => const Icon(Icons.category, color: Colors.grey),
                                placeholder: (context, url) => const Center(
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              )
                            : const Icon(Icons.category, color: Colors.grey, size: 30),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        name,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: isSelected ? AppTheme.primaryColor : AppTheme.textPrimaryColor,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          fontSize: 11,
                          height: 1.1,
                        ),
                      ),
                    ],
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

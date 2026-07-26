import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/models/category.dart';
import '../../../../core/theme/app_theme.dart';

class FeaturedCategories extends StatelessWidget {
  final List<Category> categories;
  final String language;
  final Function(String categoryId) onCategoryTap;

  const FeaturedCategories({
    super.key,
    required this.categories,
    required this.language,
    required this.onCategoryTap,
  });

  static const List<Color> _palette = [
    Color(0xFFFFE0EC),
    Color(0xFFE0E7FF),
    Color(0xFFD1FAE5),
    Color(0xFFFEF3C7),
    Color(0xFFFCE7F3),
    Color(0xFFDBEAFE),
    Color(0xFFECFDF5),
    Color(0xFFFEF9C3),
    Color(0xFFF3E8FF),
    Color(0xFFCFFAFE),
  ];

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) return const SizedBox.shrink();

    final isUz = language == 'uz';
    final title = isUz ? 'TOP KATEGORIYALAR' : 'ТОП КАТЕГОРИИ';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: AppTheme.accentColor, size: 18),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.textPrimaryColor,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: categories.length > 6 ? 6 : categories.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 2.2,
            ),
            itemBuilder: (context, index) {
              final cat = categories[index];
              final bgColor = _palette[index % _palette.length];
              final catName = cat.getLocalizedName(language);

              return InkWell(
                onTap: () => onCategoryTap(cat.id),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.black.withOpacity(0.04)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              catName,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F1410),
                                height: 1.15,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (cat.image != null && cat.image!.isNotEmpty)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: CachedNetworkImage(
                            imageUrl: cat.image!,
                            width: 38,
                            height: 38,
                            fit: BoxFit.cover,
                            errorWidget: (context, url, error) => const Icon(
                              Icons.category_outlined,
                              size: 24,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        )
                      else
                        const Icon(
                          Icons.grid_view_rounded,
                          size: 24,
                          color: AppTheme.primaryColor,
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

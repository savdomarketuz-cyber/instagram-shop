import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/data_repository.dart';
import '../../../core/models/category.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import 'category_products_screen.dart';

class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  List<Category> _categories = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    final repo = ref.read(dataRepositoryProvider);
    final list = await repo.fetchCategories();
    if (mounted) {
      setState(() {
        _categories = list;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);

    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryColor),
        ),
      );
    }

    // Filter parent categories
    final parentCategories = _categories.where((c) => c.parentId == null || c.parentId!.isEmpty).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(lang == 'ru' ? 'Каталог' : 'Katalog'),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: parentCategories.length,
        itemBuilder: (context, index) {
          final parent = parentCategories[index];
          final children = _categories.where((c) => c.parentId == parent.id).toList();
          final parentName = parent.getLocalizedName(lang);

          if (children.isEmpty) {
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                title: Text(
                  parentName,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondaryColor),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => CategoryProductsScreen(
                        slug: parent.id,
                        categoryName: parentName,
                      ),
                    ),
                  );
                },
              ),
            );
          }

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            clipBehavior: Clip.antiAlias,
            child: ExpansionTile(
              title: Text(
                parentName,
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
              ),
              iconColor: AppTheme.primaryColor,
              collapsedIconColor: AppTheme.textSecondaryColor,
              children: children.map((child) {
                final childName = child.getLocalizedName(lang);
                
                return ListTile(
                  title: Text(
                    childName,
                    style: const TextStyle(fontSize: 14, color: AppTheme.textPrimaryColor),
                  ),
                  contentPadding: const EdgeInsets.only(left: 32, right: 16),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 12, color: AppTheme.textSecondaryColor),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => CategoryProductsScreen(
                          slug: child.id,
                          categoryName: childName,
                        ),
                      ),
                    );
                  },
                );
              }).toList(),
            ),
          );
        },
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/data_repository.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/models/product.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/product_card.dart';

class CategoryProductsScreen extends ConsumerStatefulWidget {
  final String slug;
  final String categoryName;

  const CategoryProductsScreen({
    super.key,
    required this.slug,
    required this.categoryName,
  });

  @override
  ConsumerState<CategoryProductsScreen> createState() => _CategoryProductsScreenState();
}

class _CategoryProductsScreenState extends ConsumerState<CategoryProductsScreen> {
  bool _isLoading = true;
  List<Product> _products = [];

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    setState(() => _isLoading = true);
    final repo = ref.read(dataRepositoryProvider);
    final products = await repo.fetchProducts(categoryId: widget.slug, limit: 40);
    if (mounted) {
      setState(() {
        _products = products;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.categoryName),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.primaryColor),
            )
          : _products.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.storefront_outlined, size: 80, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text(
                        lang == 'ru' ? 'В этой категории пока нет товаров' : 'Ushbu kategoriyada hozircha mahsulotlar yoʻq',
                        style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 16),
                      ),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.44,
                  ),
                  itemCount: _products.length,
                  itemBuilder: (context, index) {
                    return ProductCard(product: _products[index]);
                  },
                ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/cart_wishlist_providers.dart';
import '../../../core/models/product.dart';
import '../../../core/api/data_repository.dart';
import '../../../shared/widgets/product_card.dart';

class WishlistScreen extends ConsumerStatefulWidget {
  const WishlistScreen({super.key});

  @override
  ConsumerState<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends ConsumerState<WishlistScreen> {
  List<Product> _allProducts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    final repo = ref.read(dataRepositoryProvider);
    final products = await repo.fetchProducts();
    if (mounted) {
      setState(() {
        _allProducts = products;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final wishlistIds = ref.watch(wishlistProvider);
    final wishlistProducts = _allProducts.where((p) => wishlistIds.contains(p.id)).toList();
    final lang = ref.watch(localeProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        title: Text(context.tr('nav_wishlist', ref)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppTheme.textPrimaryColor,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
          : wishlistProducts.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.favorite_border, size: 80, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text(
                        context.tr('wishlist_empty', ref),
                        style: TextStyle(
                          color: AppTheme.textSecondaryColor,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.44,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: wishlistProducts.length,
                  itemBuilder: (context, index) {
                    return ProductCard(
                      product: wishlistProducts[index],
                    );
                  },
                ),
    );
  }
}

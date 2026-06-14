import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/product.dart';
import '../../core/providers/cart_wishlist_providers.dart';
import '../../core/l10n/localization.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatter.dart';

class ProductCard extends ConsumerWidget {
  final Product product;

  const ProductCard({super.key, required this.product});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(localeProvider);
    final isFavorite = ref.watch(wishlistProvider).contains(product.id);
    
    // Check if there is a discount
    final hasDiscount = product.oldPrice != null && product.oldPrice! > product.price;
    int discountPercent = 0;
    if (hasDiscount) {
      discountPercent = (((product.oldPrice! - product.price) / product.oldPrice!) * 100).round();
    }

    return GestureDetector(
      onTap: () {
        context.push('/products/${product.id}');
      },
      child: Container(
        decoration: AppTheme.premiumCardDecoration,
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Image & Badges
            Expanded(
              child: Stack(
                children: [
                  // Image
                  Positioned.fill(
                    child: CachedNetworkImage(
                      imageUrl: product.image,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: Colors.grey.shade100,
                        child: const Center(
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                          ),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: Colors.grey.shade100,
                        child: Icon(Icons.image_not_supported_outlined, color: Colors.grey.shade400),
                      ),
                    ),
                  ),
                  
                  // Top Badges (Discount, Original, Express)
                  Positioned(
                    top: 8,
                    left: 8,
                    right: 8,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Left: Discount Badge
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (hasDiscount)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppTheme.errorColor,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '-$discountPercent%',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            const SizedBox(height: 4),
                            if (product.expressDelivery == true)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.flash_on, color: Colors.white, size: 8),
                                    SizedBox(width: 2),
                                    Text(
                                      'Express',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 8,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),

                        // Right: Favorite Heart Toggle Button
                        GestureDetector(
                          onTap: () {
                            ref.read(wishlistProvider.notifier).toggleWishlist(product.id);
                          },
                          child: CircleAvatar(
                            radius: 16,
                            backgroundColor: Colors.white.withOpacity(0.9),
                            child: Icon(
                              isFavorite ? Icons.favorite : Icons.favorite_border,
                              color: isFavorite ? AppTheme.errorColor : AppTheme.textSecondaryColor,
                              size: 18,
                            ).animate(target: isFavorite ? 1.0 : 0.0)
                             .scale(begin: const Offset(1, 1), end: const Offset(1.2, 1.2), duration: 150.ms)
                             .then()
                             .scale(begin: const Offset(1.2, 1.2), end: const Offset(1, 1), duration: 150.ms),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Original Badge Bottom Left
                  if (product.isOriginal == true)
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.accentColor.withOpacity(0.9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.verified, color: Colors.white, size: 10),
                            SizedBox(width: 2),
                            Text(
                              '100% Original',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 8,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            
            // Product Info
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Product Name
                  Text(
                    product.getLocalizedName(lang),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimaryColor,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 6),
                  
                  // Rating & Sales Row
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber, size: 12),
                      const SizedBox(width: 2),
                      Text(
                        (product.rating ?? 5.0).toStringAsFixed(1),
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '(${product.reviewCount ?? 0})',
                        style: const TextStyle(fontSize: 10, color: AppTheme.textSecondaryColor),
                      ),
                      const Spacer(),
                      Text(
                        '${product.sales} sotildi',
                        style: const TextStyle(fontSize: 10, color: AppTheme.textSecondaryColor),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Pricing & Add to Cart Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Pricing column
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (hasDiscount)
                              Text(
                                Formatter.formatPrice(product.oldPrice!, lang),
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: AppTheme.textSecondaryColor,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            Text(
                              Formatter.formatPrice(product.price, lang),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Add to Cart Action Button
                      GestureDetector(
                        onTap: () {
                          ref.read(cartProvider.notifier).addToCart(product);
                          ScaffoldMessenger.of(context).clearSnackBars();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                lang == 'ru' ? 'Товар добавлен в корзину' : 'Mahsulot savatga qoʻshildi',
                                style: const TextStyle(color: Colors.white),
                              ),
                              backgroundColor: AppTheme.primaryColor,
                              duration: const Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.add_shopping_cart,
                            color: AppTheme.primaryColor,
                            size: 18,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

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
import '../../core/utils/delivery_calculator.dart';
import '../../core/api/data_repository.dart';

class ProductCard extends ConsumerWidget {
  final Product product;
  final String? aiReason;

  const ProductCard({
    super.key,
    required this.product,
    this.aiReason,
  });

  String _getWarehouseDeliveryText(BuildContext context, WidgetRef ref, List<Map<String, dynamic>> warehouses) {
    final lang = ref.watch(localeProvider);
    return DeliveryCalculator.getDeliveryCardText(lang, product.stockDetails, warehouses);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(localeProvider);
    final isFavorite = ref.watch(wishlistProvider).contains(product.id);
    final warehousesAsync = ref.watch(warehousesProvider);
    final warehouses = warehousesAsync.value ?? [];
    
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
            AspectRatio(
              aspectRatio: 1 / 1.1,
              child: Stack(
                children: [
                  // Image
                  Positioned.fill(
                    child: CachedNetworkImage(
                      imageUrl: product.image,
                      memCacheWidth: 300,
                      memCacheHeight: 400,
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
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF00C853), Color(0xFF009624)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(6),
                                  boxShadow: [
                                    BoxShadow(color: Colors.green.withOpacity(0.3), blurRadius: 4, offset: const Offset(0, 2))
                                  ],
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.bolt, color: Colors.white, size: 10),
                                    SizedBox(width: 2),
                                    Text(
                                      'Tezkor',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.3,
                                      ),
                                    ),
                                  ],
                                ).animate(onPlay: (controller) => controller.repeat(reverse: true))
                                 .shimmer(duration: 1500.ms, color: Colors.white54),
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
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const NeverScrollableScrollPhysics(),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(10, 8, 10, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Pricing Row
                        Text(
                          Formatter.formatPrice(product.price, lang),
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                        if (hasDiscount) ...[
                          const SizedBox(height: 2),
                          Text(
                            Formatter.formatPrice(product.oldPrice!, lang),
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondaryColor,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ] else ...[
                          const SizedBox(height: 4),
                        ],
                        const SizedBox(height: 6),

                        // Product Name
                        Text(
                          product.getLocalizedName(lang),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppTheme.textPrimaryColor,
                            height: 1.2,
                          ),
                        ),
                        
                        // AI Recommendation Reason Badge
                        if (aiReason != null && aiReason!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.lightbulb_outline, size: 10, color: Color(0xFFD97706)),
                                const SizedBox(width: 3),
                                Expanded(
                                  child: Text(
                                    aiReason!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF92400E),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 4),
                        
                        // Rating Row
                        if ((product.rating ?? 0.0) == 0.0 || (product.reviewCount ?? 0) == 0)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star, color: AppTheme.primaryColor, size: 10),
                              const SizedBox(width: 4),
                              Text(
                                lang == 'ru' ? 'Новинка' : 'Yangilik',
                                style: const TextStyle(
                                  fontSize: 10, 
                                  color: AppTheme.primaryColor, 
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ).animate(onPlay: (controller) => controller.repeat())
                           .shimmer(duration: 5000.ms, color: Colors.white.withOpacity(0.85))
                        else
                          Row(
                            children: [
                              const Icon(Icons.star, color: Colors.amber, size: 12),
                              const SizedBox(width: 4),
                              Text(
                                (product.rating!).toStringAsFixed(1),
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '(${product.reviewCount} ${lang == 'ru' ? 'отзывов' : 'sharhlar'})',
                                style: const TextStyle(fontSize: 11, color: AppTheme.textSecondaryColor),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              
              const Spacer(),

                  // Delivery / Add to Cart Button
                  GestureDetector(
                    onTap: () {
                      ref.read(cartProvider.notifier).addToCart(product);
                      ScaffoldMessenger.of(context).clearSnackBars();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Row(
                            children: [
                              const Icon(Icons.check_circle, color: Colors.white),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  lang == 'ru' ? 'Товар добавлен в корзину' : 'Mahsulot savatga qoʻshildi',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          backgroundColor: AppTheme.primaryColor,
                          duration: const Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      );
                    },
                    child: Container(
                      width: double.infinity,
                      height: 42,
                      alignment: Alignment.center,
                      decoration: const BoxDecoration(
                        color: AppTheme.primaryColor,
                        borderRadius: BorderRadius.zero,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Icon(
                            product.expressDelivery == true ? Icons.bolt : Icons.local_shipping,
                            color: Colors.white,
                            size: 16,
                          ),
                          const SizedBox(width: 6),
                          Transform.translate(
                            offset: const Offset(0, -3.5),
                            child: Text(
                              product.expressDelivery == true
                                  ? (lang == 'ru' ? 'Срочно (за 2 часа)' : 'Darhol (2-soatda)')
                                  : _getWarehouseDeliveryText(context, ref, warehouses),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ).animate(target: 1.0)
                     .scale(begin: const Offset(0.98, 0.98), end: const Offset(1.0, 1.0), duration: 200.ms, curve: Curves.easeOutBack),
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

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/cart_wishlist_providers.dart';
import '../../../core/providers/checkout_provider.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _HomeScreenLink extends StatelessWidget {
  const _HomeScreenLink();
  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }
}

class _CartScreenState extends ConsumerState<CartScreen> {
  final TextEditingController _promoController = TextEditingController();
  bool _isPromoLoading = false;

  @override
  void initState() {
    super.initState();
    // Pre-load smart discounts on cart screen load
    Future.microtask(() {
      ref.read(checkoutProvider.notifier).fetchPersonalOffers();
    });
  }

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  void _showPromoSheet(BuildContext context, double subtotal) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final lang = ref.watch(localeProvider);
          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            ),
            padding: EdgeInsets.only(
              left: 24,
              right: 24,
              top: 8,
              bottom: MediaQuery.of(context).viewInsets.bottom + 32,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  width: 60,
                  height: 60,
                  decoration: const BoxDecoration(
                    color: Color(0xFFEAF3EC),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.card_giftcard,
                    color: AppTheme.primaryColor,
                    size: 30,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  lang == 'ru' ? 'Промокод' : 'Promokod',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimaryColor,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      lang == 'ru' ? 'Попробуйте: ' : 'Sinab ko\'ring: ',
                      style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 13),
                    ),
                    const Text(
                      'VELARI25',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: _promoController,
                  autofocus: true,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    hintText: lang == 'ru' ? 'ВВЕДИТЕ ПРОМОКОД' : 'PROMOKODINGIZNI KIRITING',
                    filled: true,
                    fillColor: Colors.grey.shade50,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2.0,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _isPromoLoading
                        ? null
                        : () async {
                            final code = _promoController.text.trim();
                            if (code.isEmpty) return;

                            setState(() => _isPromoLoading = true);
                            final success = await ref.read(checkoutProvider.notifier).applyPromo(
                                  code,
                                  subtotal,
                                  null, // Guest for now, filled during checkout
                                );
                            if (mounted) {
                              setState(() => _isPromoLoading = false);
                              if (success) {
                                _promoController.clear();
                                Navigator.pop(context);
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                      elevation: 0,
                    ),
                    child: _isPromoLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : Text(
                            lang == 'ru' ? 'Применить' : 'Qo\'llash',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatPrice(double amount, String lang) {
    final formatted = amount.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]} ',
        );
    return formatted;
  }

  @override
  Widget build(BuildContext context) {
    final cartItems = ref.watch(cartProvider);
    final checkoutState = ref.watch(checkoutProvider);
    final lang = ref.watch(localeProvider);

    if (cartItems.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text(context.tr('cart.title', ref)),
          centerTitle: true,
          elevation: 0,
          backgroundColor: Colors.transparent,
          foregroundColor: AppTheme.textPrimaryColor,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(36),
                  ),
                  child: Icon(Icons.shopping_bag_outlined, size: 48, color: Colors.grey.shade400),
                ),
                const SizedBox(height: 24),
                Text(
                  context.tr('cart.empty', ref),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimaryColor,
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => context.go('/'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                      shadowColor: AppTheme.primaryColor.withOpacity(0.3),
                      elevation: 8,
                    ),
                    child: Text(
                      context.tr('cart.startShopping', ref),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Calculations
    final subtotal = cartItems.fold<double>(0.0, (sum, item) => sum + (item.product.price * item.quantity));
    
    double smartDiscount = 0.0;
    for (final item in cartItems) {
      final pct = checkoutState.personalOffers[item.product.id] ?? 0.0;
      if (pct > 0) {
        smartDiscount += (item.product.price * item.quantity * pct / 100).floorToDouble();
      }
    }

    final promoDiscount = checkoutState.promoDiscount;
    final goodsTotal = (subtotal - smartDiscount - promoDiscount).clamp(0.0, double.infinity);
    
    // Delivery calculation
    final deliveryBasis = (subtotal - smartDiscount).clamp(0.0, double.infinity);
    final deliveryFee = deliveryBasis >= 150000 ? 0.0 : 25000.0;
    final total = goodsTotal + deliveryFee;

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        title: Text(context.tr('cart.title', ref)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppTheme.textPrimaryColor,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep_outlined, color: Colors.red),
            onPressed: () {
              ref.read(cartProvider.notifier).clearCart();
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 160),
            children: [
              // Cart items list
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: cartItems.length,
                separatorBuilder: (context, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = cartItems[index];
                  final name = (lang == 'ru' ? item.product.nameRu : item.product.nameUz) ?? item.product.name;
                  final pct = checkoutState.personalOffers[item.product.id] ?? 0.0;
                  final itemTotal = item.product.price * item.quantity;
                  final itemSmartDiscount = pct > 0 ? (itemTotal * pct / 100).floorToDouble() : 0.0;

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Image
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: CachedNetworkImage(
                            imageUrl: item.product.image,
                            memCacheWidth: 200,
                            memCacheHeight: 300,
                            width: 80,
                            height: 80,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(color: Colors.grey.shade100),
                            errorWidget: (context, url, error) => Container(
                              color: Colors.grey.shade100,
                              child: const Icon(Icons.image_not_supported_outlined, color: Colors.grey),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Content
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimaryColor,
                                ),
                              ),
                              if (item.selectedColor != null || item.selectedSize != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  '${item.selectedColor ?? ''} ${item.selectedSize != null ? '/ ${item.selectedSize}' : ''}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey.shade500,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 12),
                              // Counter + Price Row
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  // Counter
                                  Container(
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF5F5F0),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.remove, size: 14, color: Color(0xFF5A625C)),
                                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                          padding: EdgeInsets.zero,
                                          onPressed: () {
                                            ref.read(cartProvider.notifier).updateQuantity(
                                                  item.product.id,
                                                  -1,
                                                  color: item.selectedColor,
                                                  size: item.selectedSize,
                                                );
                                          },
                                        ),
                                        Text(
                                          '${item.quantity}',
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w800,
                                            color: AppTheme.textPrimaryColor,
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.add, size: 14, color: AppTheme.primaryColor),
                                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                          padding: EdgeInsets.zero,
                                          onPressed: () {
                                            ref.read(cartProvider.notifier).updateQuantity(
                                                  item.product.id,
                                                  1,
                                                  color: item.selectedColor,
                                                  size: item.selectedSize,
                                                );
                                          },
                                        ),
                                      ],
                                    ),
                                  ),
                                  // Price
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        _formatPrice(itemTotal - itemSmartDiscount, lang),
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w800,
                                          color: pct > 0 ? const Color(0xFF4F46E5) : AppTheme.textPrimaryColor,
                                        ),
                                      ),
                                      if (pct > 0)
                                        Text(
                                          _formatPrice(itemTotal, lang),
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.grey.shade400,
                                            decoration: TextDecoration.lineThrough,
                                          ),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        // Delete Button
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 20),
                          onPressed: () {
                            ref.read(cartProvider.notifier).removeFromCart(
                                  item.product.id,
                                  color: item.selectedColor,
                                  size: item.selectedSize,
                                );
                          },
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
              // Promo Code Coupon
              if (checkoutState.promoCode != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF3EC),
                    border: Border.all(color: AppTheme.primaryColor, width: 1.5),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.local_offer_outlined, color: Colors.white, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              checkoutState.promoCode!,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textPrimaryColor,
                                letterSpacing: 0.3,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '-${_formatPrice(checkoutState.promoDiscount, lang)} ${lang == 'ru' ? 'скидка' : 'chegirma'}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Color(0xFFEF4444)),
                        onPressed: () {
                          ref.read(checkoutProvider.notifier).removePromo();
                        },
                      ),
                    ],
                  ),
                )
              else
                InkWell(
                  onTap: () => _showPromoSheet(context, subtotal),
                  borderRadius: BorderRadius.circular(18),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: Colors.black.withOpacity(0.06)),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(Icons.local_offer_outlined, color: Colors.grey.shade600, size: 18),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                context.tr('common.promoQuestion', ref),
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textPrimaryColor,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                lang == 'ru' ? 'Введите для скидки' : 'Chegirma uchun kiriting',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.textSecondaryColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: AppTheme.textSecondaryColor),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              // Order Summary Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          context.tr('common.products', ref),
                          style: const TextStyle(fontSize: 14, color: AppTheme.textSecondaryColor, fontWeight: FontWeight.w500),
                        ),
                        Text(
                          _formatPrice(subtotal, lang),
                          style: const TextStyle(fontSize: 14, color: AppTheme.textPrimaryColor, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    if (smartDiscount > 0) ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.star_outline, color: Color(0xFF4F46E5), size: 16),
                              const SizedBox(width: 6),
                              Text(
                                lang == 'ru' ? 'Персональная скидка' : 'Shaxsiy chegirma',
                                style: const TextStyle(fontSize: 14, color: Color(0xFF4F46E5), fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),
                          Text(
                            '-${_formatPrice(smartDiscount, lang)}',
                            style: const TextStyle(fontSize: 14, color: Color(0xFF4F46E5), fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ],
                    if (promoDiscount > 0) ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.local_offer_outlined, color: AppTheme.primaryColor, size: 16),
                              const SizedBox(width: 6),
                              Text(
                                checkoutState.promoCode ?? 'Promo',
                                style: const TextStyle(fontSize: 14, color: AppTheme.primaryColor, fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),
                          Text(
                            '-${_formatPrice(promoDiscount, lang)}',
                            style: const TextStyle(fontSize: 14, color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          context.tr('cart.delivery', ref),
                          style: const TextStyle(fontSize: 14, color: AppTheme.textSecondaryColor, fontWeight: FontWeight.w500),
                        ),
                        Text(
                          deliveryFee > 0 ? _formatPrice(deliveryFee, lang) : context.tr('cart.free', ref),
                          style: TextStyle(
                            fontSize: 14,
                            color: deliveryFee > 0 ? AppTheme.textPrimaryColor : AppTheme.primaryColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(height: 1, color: Color(0xFFE2E8F0)),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          context.tr('common.total', ref),
                          style: const TextStyle(fontSize: 16, color: AppTheme.textPrimaryColor, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          _formatPrice(total, lang),
                          style: const TextStyle(fontSize: 22, color: AppTheme.textPrimaryColor, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          // Sticky Bottom Bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.9),
                border: const Border(top: BorderSide(color: Color(0x1F0F1410), width: 0.5)),
              ),
              child: SafeArea(
                child: SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: () {
                      context.push('/checkout');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(27)),
                      shadowColor: AppTheme.primaryColor.withOpacity(0.3),
                      elevation: 8,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '${context.tr('common.checkout', ref)} · ${_formatPrice(total, lang)}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: -0.2),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward, size: 18),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

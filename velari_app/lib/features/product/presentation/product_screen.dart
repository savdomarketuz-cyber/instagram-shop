import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_ce/hive_ce.dart';
import '../../../core/api/data_repository.dart';
import '../../../core/models/product.dart';
import '../../../core/models/comment.dart';
import '../../../core/providers/cart_wishlist_providers.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatter.dart';
import '../../../core/utils/delivery_calculator.dart';

class ProductScreen extends ConsumerStatefulWidget {
  final String id;

  const ProductScreen({super.key, required this.id});

  @override
  ConsumerState<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends ConsumerState<ProductScreen> {
  bool _isLoading = true;
  Product? _product;
  List<Product> _variants = [];
  List<Map<String, String>> _specs = [];
  List<Comment> _comments = [];
  int _activeImageIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadProductData();
  }

  @override
  void didUpdateWidget(ProductScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.id != widget.id) {
      _loadProductData();
    }
  }

  Future<void> _addToRecentlyViewed() async {
    final box = Hive.box('settings');
    final List<dynamic> list = box.get('recently_viewed', defaultValue: <dynamic>[]);
    final ids = list.map((e) => e.toString()).toList();
    ids.remove(widget.id);
    ids.insert(0, widget.id);
    if (ids.length > 15) ids.removeLast();
    await box.put('recently_viewed', ids);
  }

  Future<void> _loadProductData() async {
    setState(() {
      _isLoading = true;
      _activeImageIndex = 0;
    });

    final repo = ref.read(dataRepositoryProvider);
    final product = await repo.fetchProductById(widget.id);

    if (product != null && mounted) {
      _product = product;
      await _addToRecentlyViewed();
      
      // Load Specs & Comments in parallel
      final results = await Future.wait<dynamic>([
        repo.fetchProductSpecifications(widget.id),
        repo.fetchProductComments(widget.id),
        if (product.groupId != null && product.groupId!.isNotEmpty)
          repo.supabase.from('products').select(DataRepository.productSelectFields).eq('group_id', product.groupId!)
        else
          Future.value(null),
      ]);

      if (mounted) {
        setState(() {
          _specs = results[0] as List<Map<String, String>>;
          _comments = results[1] as List<Comment>;
          
          if (results[2] != null) {
            final List list = results[2] as List;
            _variants = list.map((x) => Product.fromJson(x as Map<String, dynamic>)).toList();
          } else {
            _variants = [];
          }
          
          _isLoading = false;
        });
      }
    } else if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final isFavorite = _product != null && ref.watch(wishlistProvider).contains(_product!.id);
    final warehousesAsync = ref.watch(warehousesProvider);
    final warehouses = warehousesAsync.value ?? [];

    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryColor),
        ),
      );
    }

    if (_product == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Xatolik')),
        body: Center(
          child: Text(lang == 'ru' ? 'Товар не найден' : 'Mahsulot topilmadi'),
        ),
      );
    }

    final hasDiscount = _product!.oldPrice != null && _product!.oldPrice! > _product!.price;
    final images = _product!.images ?? [_product!.image];

    return Scaffold(
      body: Stack(
        children: [
          // Scrollable Content
          CustomScrollView(
            slivers: [
              // Premium App Bar with Media Carousel
              SliverAppBar(
                expandedHeight: MediaQuery.of(context).size.width,
                pinned: true,
                backgroundColor: AppTheme.surfaceColor,
                leading: CircleAvatar(
                  backgroundColor: Colors.white.withOpacity(0.9),
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimaryColor),
                    onPressed: () => context.pop(),
                  ),
                ),
                actions: [
                  CircleAvatar(
                    backgroundColor: Colors.white.withOpacity(0.9),
                    child: IconButton(
                      icon: Icon(
                        isFavorite ? Icons.favorite : Icons.favorite_border,
                        color: isFavorite ? AppTheme.errorColor : AppTheme.textSecondaryColor,
                      ),
                      onPressed: () {
                        ref.read(wishlistProvider.notifier).toggleWishlist(_product!.id);
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    children: [
                      // Carousel View
                      PageView.builder(
                        itemCount: images.length,
                        onPageChanged: (index) {
                          setState(() => _activeImageIndex = index);
                        },
                        itemBuilder: (context, index) {
                          return CachedNetworkImage(
                            imageUrl: images[index],
                            fit: BoxFit.cover,
                          );
                        },
                      ),
                      
                      // Page Indicators
                      if (images.length > 1)
                        Positioned(
                          bottom: 16,
                          left: 0,
                          right: 0,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(
                              images.length,
                              (index) => Container(
                                width: 8,
                                height: 8,
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _activeImageIndex == index
                                      ? AppTheme.primaryColor
                                      : Colors.white.withOpacity(0.5),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              
              // Product Details List
              SliverList(
                delegate: SliverChildListDelegate([
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Pricing & Discount
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              Formatter.formatPrice(_product!.price, lang),
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                            const SizedBox(width: 12),
                            if (hasDiscount) ...[
                              Text(
                                Formatter.formatPrice(_product!.oldPrice!, lang),
                                style: const TextStyle(
                                  fontSize: 16,
                                  color: AppTheme.textSecondaryColor,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppTheme.errorColor,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '-${(((_product!.oldPrice! - _product!.price) / _product!.oldPrice!) * 100).round()}%',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 12),
                        
                        // Product Name
                        Text(
                          _product!.getLocalizedName(lang),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimaryColor,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 12),
                        
                        // Rating, Reviews & Stock Info
                        Row(
                          children: [
                            const Icon(Icons.star, color: Colors.amber, size: 18),
                            const SizedBox(width: 4),
                            Text(
                              (_product!.rating ?? 5.0).toStringAsFixed(1),
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '(${_product!.reviewCount ?? 0} sharhlar)',
                              style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 13),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.inventory_2_outlined, color: AppTheme.primaryColor, size: 14),
                                  const SizedBox(width: 4),
                                  Text(
                                    lang == 'ru'
                                        ? 'В наличии: ${_product!.calculatedStock}'
                                        : 'Omborda: ${_product!.calculatedStock} dona',
                                    style: const TextStyle(
                                      color: AppTheme.primaryColor,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Delivery & Returns Professional Panel
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Column(
                            children: [
                              Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        shape: BoxShape.circle,
                                        boxShadow: [
                                          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10),
                                        ],
                                      ),
                                      child: const Icon(Icons.local_shipping_outlined, color: AppTheme.primaryColor, size: 24),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            lang == 'ru' ? 'Быстрая доставка' : 'Tezkor yetkazib berish',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            _product?.expressDelivery == true
                                                ? (lang == 'ru' ? 'Срочно (за 2 часа)' : 'Darhol (2-soatda)')
                                                : (lang == 'ru' 
                                                    ? 'Доставим: ${DeliveryCalculator.getDeliveryDateText(lang, _product?.stockDetails, warehouses)}' 
                                                    : 'Yetkazib beriladi: ${DeliveryCalculator.getDeliveryDateText(lang, _product?.stockDetails, warehouses)}'),
                                            style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Divider(height: 1, indent: 16, endIndent: 16),
                              Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        shape: BoxShape.circle,
                                        boxShadow: [
                                          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10),
                                        ],
                                      ),
                                      child: const Icon(Icons.replay_outlined, color: AppTheme.accentColor, size: 24),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            lang == 'ru' ? 'Легкий возврат 14 дней' : '14 kun ichida oson qaytarish',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            lang == 'ru' ? 'Если товар не подошел' : 'Agar mahsulot yoqmasa yoki mos kelmasa',
                                            style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        
                        // Variants Selector (color_name/model grouped)
                        if (_variants.length > 1) ...[
                          Text(
                            lang == 'ru' ? 'Варианты' : 'Variantlar',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            height: 50,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: _variants.length,
                              itemBuilder: (context, index) {
                                final variant = _variants[index];
                                final isSelected = variant.id == _product!.id;
                                
                                return GestureDetector(
                                  onTap: () {
                                    context.replace('/products/${variant.id}');
                                  },
                                  child: Container(
                                    margin: const EdgeInsets.only(right: 12),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: isSelected ? AppTheme.primaryColor : Colors.white,
                                      border: Border.all(
                                        color: isSelected ? AppTheme.primaryColor : Colors.grey.shade300,
                                        width: 1.5,
                                      ),
                                      borderRadius: BorderRadius.circular(25),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      variant.colorName ?? variant.model ?? variant.name,
                                      style: TextStyle(
                                        color: isSelected ? Colors.white : AppTheme.textPrimaryColor,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                          const Divider(height: 32),
                        ],
                        
                        // Description Section
                        Text(
                          lang == 'ru' ? 'Описание' : 'Tavsif',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _product!.getLocalizedDescription(lang) ?? '',
                          style: const TextStyle(
                            color: AppTheme.textSecondaryColor,
                            height: 1.5,
                            fontSize: 14,
                          ),
                        ),
                        const Divider(height: 32),
                        
                        // Specifications Section
                        if (_specs.isNotEmpty) ...[
                          Row(
                            children: [
                              const Icon(Icons.settings_outlined, color: AppTheme.accentColor),
                              const SizedBox(width: 8),
                              Text(
                                lang == 'ru' ? 'Характеристики' : 'Xususiyatlari',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              border: Border.all(color: Colors.grey.shade100),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _specs.length,
                              separatorBuilder: (context, index) => const Divider(height: 1),
                              itemBuilder: (context, index) {
                                final spec = _specs[index];
                                final name = lang == 'uz' ? spec['name_uz'] : spec['name_ru'];
                                
                                return Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        name ?? spec['name'] ?? '',
                                        style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 13),
                                      ),
                                      Text(
                                        spec['value'] ?? '',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
                          const Divider(height: 32),
                        ],

                        // Reviews Section
                        Row(
                          children: [
                            const Icon(Icons.comment_outlined, color: AppTheme.primaryColor),
                            const SizedBox(width: 8),
                            Text(
                              lang == 'ru' ? 'Отзывы' : 'Sharhlar',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const SizedBox(width: 8),
                            CircleAvatar(
                              radius: 10,
                              backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                              child: Text(
                                _comments.length.toString(),
                                style: const TextStyle(fontSize: 10, color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (_comments.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: Text(
                                lang == 'ru' ? 'Отзывов пока нет. Будьте первым!' : 'Sharhlar mavjud emas. Birinchi boʻling!',
                                style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 13),
                              ),
                            ),
                          )
                        else
                          ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _comments.length,
                            itemBuilder: (context, index) {
                              final comment = _comments[index];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.shade100),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          comment.userName ?? 'Mijoz',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                        if (comment.rating != null)
                                          Row(
                                            children: List.generate(
                                              5,
                                              (starIndex) => Icon(
                                                Icons.star,
                                                size: 12,
                                                color: starIndex < comment.rating!.round()
                                                    ? Colors.amber
                                                    : Colors.grey.shade300,
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      comment.text,
                                      style: const TextStyle(color: AppTheme.textPrimaryColor, fontSize: 13),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        const SizedBox(height: 80), // Padding for Bottom Actions
                      ],
                    ),
                  ),
                ]),
              ),
            ],
          ),
          
          // Floating Bottom Actions Bar (Savatga qo'shish & Tezkor xarid)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    // Savatga qo'shish button (Outlined)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          ref.read(cartProvider.notifier).addToCart(_product!);
                          ScaffoldMessenger.of(context).clearSnackBars();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                lang == 'ru' ? 'Товар добавлен в корзину' : 'Mahsulot savatga qoʻshildi',
                              ),
                              backgroundColor: AppTheme.primaryColor,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        child: Text(context.tr('add_to_cart', ref)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    
                    // Tezkor xarid button (Elevated)
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          // Fast purchase routes directly to checkout with this single product
                          ref.read(cartProvider.notifier).clearCart();
                          ref.read(cartProvider.notifier).addToCart(_product!);
                          context.push('/checkout');
                        },
                        child: Text(context.tr('buy_now', ref)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/models/product.dart';
import '../../../shared/widgets/product_card.dart';

import '../../../core/api/data_repository.dart';

class StoreScreen extends ConsumerStatefulWidget {
  final String warehouseId;

  const StoreScreen({super.key, required this.warehouseId});

  @override
  ConsumerState<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends ConsumerState<StoreScreen> {
  Map<String, dynamic>? _warehouse;
  List<Product> _products = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchStoreData();
  }

  Future<void> _fetchStoreData() async {
    try {
      final supabase = ref.read(supabaseClientProvider);
      
      // 1. Fetch Warehouse details
      final whRes = await supabase
          .from('warehouses')
          .select('*')
          .eq('id', widget.warehouseId)
          .maybeSingle();

      if (whRes != null) {
        setState(() {
          _warehouse = whRes as Map<String, dynamic>;
        });

        // 2. Fetch products associated with this warehouse
        final prodRes = await supabase
            .from('products')
            .select(DataRepository.productSelectFields)
            .eq('warehouse_id', widget.warehouseId)
            .eq('is_deleted', false)
            .gt('stock', 0);

        if (prodRes != null) {
          setState(() {
            _products = (prodRes as List).map((x) => Product.fromJson(x as Map<String, dynamic>)).toList();
          });
        }
      }
    } catch (e) {
      debugPrint("Error loading store details: $e");
    } finally {
      setState(() => _isLoading = false);
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

    if (_warehouse == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Text(
            lang == 'ru' ? 'Магазин не найден' : 'Doʻkon topilmadi',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
      );
    }

    final String name = _warehouse!['name'] ?? '';
    final String? logo = _warehouse!['logo'];
    final String? address = _warehouse!['address'];

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        title: Text(lang == 'ru' ? 'Магазин склада' : 'Ombor doʻkoni'),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: AppTheme.textPrimaryColor,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Store Profile Header card (Premium Glassmorphic White/Green)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Colors.white, Color(0xFFF2F8F3)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: const Color(0xFFE6EFE8)),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.04),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Logo
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: logo != null ? Colors.white : AppTheme.primaryColor,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: logo != null
                        ? Image.network(logo, fit: BoxFit.cover)
                        : const Icon(Icons.store, color: Colors.white, size: 32),
                  ),
                  const SizedBox(width: 16),
                  // Details
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.store, color: AppTheme.primaryColor, size: 12),
                            const SizedBox(width: 4),
                            Text(
                              (lang == 'ru' ? 'Магазин' : "Do'kon").toUpperCase(),
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                color: AppTheme.primaryColor,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppTheme.textPrimaryColor),
                        ),
                        if (address != null && address.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            address,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondaryColor, fontWeight: FontWeight.w500),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Text(
                          "${_products.length} ${lang == 'ru' ? 'товаров' : 'ta mahsulot'}",
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade400,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Products grid list
            Text(
              lang == 'ru' ? 'ТОВАРЫ НА СКЛАДЕ' : 'OMBORDAGI MAHSULOTLAR',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade400,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 12),

            if (_products.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 40),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: Colors.black.withOpacity(0.04)),
                ),
                alignment: Alignment.center,
                child: Text(
                  lang == 'ru' ? 'Товары временно распроданы' : 'Mahsulotlar vaqtincha tugagan',
                  style: TextStyle(color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                ),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 16,
                  childAspectRatio: 0.44,
                ),
                itemCount: _products.length,
                itemBuilder: (context, index) {
                  final p = _products[index];
                  return ProductCard(product: p);
                },
              ),
          ],
        ),
      ),
    );
  }
}

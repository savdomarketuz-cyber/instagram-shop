import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive_ce.dart';
import '../../../../core/api/data_repository.dart';
import '../../../../core/models/product.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/product_card.dart';

class RecentlyViewed extends ConsumerStatefulWidget {
  final String language;

  const RecentlyViewed({super.key, required this.language});

  @override
  ConsumerState<RecentlyViewed> createState() => _RecentlyViewedState();
}

class _RecentlyViewedState extends ConsumerState<RecentlyViewed> {
  List<Product> _products = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRecentlyViewed();
  }

  Future<void> _loadRecentlyViewed() async {
    final box = Hive.box('settings');
    final List<dynamic> list = box.get('recently_viewed', defaultValue: <dynamic>[]);
    final ids = list.map((e) => e.toString()).toList();

    if (ids.isEmpty) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    final repo = ref.read(dataRepositoryProvider);
    final fetched = <Product>[];
    
    // Fetch in parallel
    final futures = ids.map((id) => repo.fetchProductById(id));
    final results = await Future.wait(futures);

    for (final p in results) {
      if (p != null) fetched.add(p);
    }

    if (mounted) {
      setState(() {
        _products = fetched;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading || _products.isEmpty) return const SizedBox.shrink();

    final isUz = widget.language == 'uz';
    final title = isUz ? 'Yaqinda koʻrilganlar' : 'Вы недавно смотрели';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimaryColor,
            ),
          ),
        ),
        SizedBox(
          height: 240,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _products.length,
            itemBuilder: (context, index) {
              return Container(
                width: 150,
                margin: const EdgeInsets.only(right: 12),
                child: ProductCard(product: _products[index]),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

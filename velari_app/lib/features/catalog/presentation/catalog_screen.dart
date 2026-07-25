import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/data_repository.dart';
import '../../../core/models/category.dart';
import '../../../core/models/product.dart';
import '../../../core/models/brand.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/product_card.dart';
import 'widgets/catalog_filter_sheet.dart';
import 'widgets/catalog_sort_sheet.dart';

class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  // Data
  List<Category> _allCategories = [];
  List<Product> _allProducts = [];
  List<Brand> _brands = [];
  bool _isLoading = true;

  // Active Selections
  String _searchQuery = '';
  String _mainCat = 'all';
  String _subCat = 'all';

  // Filters
  List<String> _selectedBrands = [];
  double _minRating = 0.0;
  double _minPrice = 0.0;
  double _maxPrice = 0.0; // 0 means max available
  String _sortBy = 'popular';

  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final repo = ref.read(dataRepositoryProvider);
    final futures = await Future.wait([
      repo.fetchCategories(),
      repo.fetchProducts(limit: 120),
      repo.fetchBrands(),
    ]);

    if (!mounted) return;
    setState(() {
      _allCategories = futures[0] as List<Category>;
      _allProducts = futures[1] as List<Product>;
      _brands = futures[2] as List<Brand>;
      _isLoading = false;
    });
  }

  List<Product> get _filteredProducts {
    List<Product> list = _allProducts;

    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((p) =>
          p.name.toLowerCase().contains(q) ||
          (p.nameUz?.toLowerCase().contains(q) ?? false) ||
          (p.nameRu?.toLowerCase().contains(q) ?? false)).toList();
    }

    final activeCat = _subCat != 'all' ? _subCat : _mainCat;
    if (activeCat != 'all') {
      List<String> getAllIds(String catId) {
        final children = _allCategories.where((c) => c.parentId == catId);
        List<String> ids = [catId];
        for (var child in children) {
          ids.addAll(getAllIds(child.id));
        }
        return ids;
      }

      final allowedIds = getAllIds(activeCat);
      list = list.where((p) => allowedIds.contains(p.category)).toList();
    }

    if (_selectedBrands.isNotEmpty) {
      list = list.where((p) => p.brandId != null && _selectedBrands.contains(p.brandId)).toList();
    }

    if (_minRating > 0) {
      list = list.where((p) => (p.rating ?? 0.0) >= _minRating).toList();
    }

    if (_minPrice > 0 || _maxPrice > 0) {
      list = list.where((p) {
        final okMin = _minPrice <= 0 || p.price >= _minPrice;
        final okMax = _maxPrice <= 0 || p.price <= _maxPrice;
        return okMin && okMax;
      }).toList();
    }

    final sorted = List<Product>.from(list);
    switch (_sortBy) {
      case 'new':
        sorted.sort((a, b) => (b.createdAt ?? '').compareTo(a.createdAt ?? ''));
        break;
      case 'price_asc':
        sorted.sort((a, b) => a.price.compareTo(b.price));
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.price.compareTo(a.price));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating ?? 0.0).compareTo(a.rating ?? 0.0));
        break;
      default:
        sorted.sort((a, b) => b.sales.compareTo(a.sales));
    }

    return sorted;
  }

  void _openFilterSheet(String lang) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return CatalogFilterSheet(
          lang: lang,
          brands: _brands,
          maxProductPrice: _allProducts.fold<double>(0.0, (m, p) => p.price > m ? p.price : m),
          initialSelectedBrands: _selectedBrands,
          initialMinRating: _minRating,
          initialMinPrice: _minPrice,
          initialMaxPrice: _maxPrice,
          onApply: (brands, rating, minP, maxP) {
            setState(() {
              _selectedBrands = brands;
              _minRating = rating;
              _minPrice = minP;
              _maxPrice = maxP;
            });
          },
        );
      },
    );
  }

  void _openSortSheet(String lang) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return CatalogSortSheet(
          lang: lang,
          currentSort: _sortBy,
          onSelect: (sortKey) {
            setState(() {
              _sortBy = sortKey;
            });
          },
        );
      },
    );
  }

  Widget _buildPill(String title, bool isActive, VoidCallback onTap, {bool isSmall = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: EdgeInsets.symmetric(horizontal: isSmall ? 16 : 20, vertical: isSmall ? 8 : 10),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primaryColor : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: isActive ? AppTheme.primaryColor : Colors.grey.shade200),
          boxShadow: [
            if (!isActive) BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2))
          ],
        ),
        child: Text(
          title,
          style: TextStyle(
            color: isActive ? Colors.white : AppTheme.textPrimaryColor,
            fontWeight: FontWeight.bold,
            fontSize: isSmall ? 13 : 14,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);

    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFFFAFAF6),
        body: Center(child: CircularProgressIndicator(color: AppTheme.primaryColor)),
      );
    }

    final mainCategories = _allCategories.where((c) => c.parentId == null || c.parentId!.isEmpty).toList();
    final subCategories = _mainCat != 'all' ? _allCategories.where((c) => c.parentId == _mainCat).toList() : <Category>[];

    final productsToShow = _filteredProducts;
    int activeFilterCount = (_selectedBrands.isNotEmpty ? 1 : 0) + (_minRating > 0 ? 1 : 0) + (_minPrice > 0 || _maxPrice > 0 ? 1 : 0);

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Row(
                children: [
                  Text(
                    lang == 'uz' ? 'Katalog' : 'Каталог',
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: -1),
                  ),
                ],
              ),
            ),

            // Search Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade100),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2))],
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: lang == 'uz' ? "Mahsulot, brend, kategoriya..." : "Товар, бренд, категория...",
                    hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14, fontWeight: FontWeight.w500),
                    prefixIcon: Icon(Icons.search, color: Colors.grey.shade300, size: 20),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ),

            // Main Categories
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _buildPill(lang == 'uz' ? 'Hammasi' : 'Все', _mainCat == 'all', () {
                    setState(() {
                      _mainCat = 'all';
                      _subCat = 'all';
                    });
                  }),
                  ...mainCategories.map((c) => _buildPill(c.getLocalizedName(lang), _mainCat == c.id, () {
                        setState(() {
                          _mainCat = c.id;
                          _subCat = 'all';
                        });
                      }))
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Sub Categories
            if (subCategories.isNotEmpty)
              Container(
                height: 38,
                margin: const EdgeInsets.only(bottom: 12),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _buildPill(lang == 'uz' ? 'Barchasi' : 'Все', _subCat == 'all', () {
                      setState(() => _subCat = 'all');
                    }, isSmall: true),
                    ...subCategories.map((c) => _buildPill(c.getLocalizedName(lang), _subCat == c.id, () {
                          setState(() => _subCat = c.id);
                        }, isSmall: true))
                  ],
                ),
              ),

            // Filter & Sort Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _openFilterSheet(lang),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade100),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2))],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.tune, size: 16, color: AppTheme.textPrimaryColor),
                            const SizedBox(width: 8),
                            Text(
                              lang == 'uz' ? 'Filtrlar' : 'Фильтры',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            if (activeFilterCount > 0)
                              Container(
                                margin: const EdgeInsets.only(left: 6),
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(color: AppTheme.primaryColor, shape: BoxShape.circle),
                                child: Text(
                                  activeFilterCount.toString(),
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _openSortSheet(lang),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade100),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2))],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.swap_vert, size: 16, color: AppTheme.textPrimaryColor),
                            const SizedBox(width: 8),
                            Text(
                              lang == 'uz' ? 'Saralash' : 'Сортировка',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Products Grid
            Expanded(
              child: productsToShow.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off, size: 64, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text(
                            lang == 'uz' ? 'Mahsulot topilmadi' : 'Товары не найдены',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey.shade500),
                          ),
                        ],
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.44,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 16,
                      ),
                      itemCount: productsToShow.length,
                      itemBuilder: (context, index) {
                        return ProductCard(
                          key: ValueKey(productsToShow[index].id),
                          product: productsToShow[index],
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

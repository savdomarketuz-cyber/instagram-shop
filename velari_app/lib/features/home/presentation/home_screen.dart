import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/data_repository.dart';
import '../../../core/models/product.dart';
import '../../../core/models/category.dart';
import '../../../core/models/banner.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/product_card.dart';
import 'widgets/stories_row.dart';
import 'widgets/promo_countdown.dart';
import 'widgets/banner_section.dart';
import 'widgets/category_filter.dart';
import 'widgets/trust_strip.dart';
import 'widgets/recently_viewed.dart';
import 'widgets/featured_categories.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  
  List<Product> _products = [];
  List<Category> _categories = [];
  List<PromotionBanner> _banners = [];
  List<Category> _featuredCategories = [];
  List<String> _aiProductOrder = [];
  Map<String, Map<String, String>> _aiReasons = {};
  
  // Search state
  List<Product>? _searchResults;
  Map<String, dynamic>? _searchFacets;
  String? _didYouMean;
  bool _isFallback = false;
  bool _isSearchLoading = false;
  String? _activeFacet;

  // Filter & Pagination state
  String _activeFilter = 'all';
  String _activeParent = 'all';
  String _activeTab = 'for_you'; // 'for_you' or 'popular'
  bool _isLoading = true;
  bool _isFetchingMore = false;
  int _pageNumber = 0;
  bool _hasMore = true;
  String? _errorMessage;

  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
    _scrollController.addListener(_scrollListener);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _scrollListener() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      if (_hasMore && !_isLoading && !_isFetchingMore && _searchResults == null) {
        _loadMoreProducts();
      }
    }
  }

  Future<void> _loadInitialData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final repo = ref.read(dataRepositoryProvider);
      
      // Load categories, banners, products, featured categories, and AI personalize in parallel
      final results = await Future.wait([
        repo.fetchCategories(),
        repo.fetchBanners(),
        repo.fetchProducts(orderByPopular: _activeTab == 'popular', limit: 20, offset: 0),
        repo.fetchFeaturedCategories(),
        repo.fetchPersonalizedProducts(),
      ]);

      if (mounted) {
        final loadedCats = results[0] as List<Category>;
        final loadedBanners = results[1] as List<PromotionBanner>;
        var loadedProducts = results[2] as List<Product>;
        final loadedFeatured = results[3] as List<Category>;
        final aiData = results[4] as Map<String, dynamic>;

        final order = aiData['order'] as List<String>? ?? [];
        final reasons = aiData['reasons'] as Map<String, Map<String, String>>? ?? {};

        // If in 'for_you' tab and AI recommendations exist, re-order products
        if (order.isNotEmpty && _activeTab == 'for_you') {
          final Map<String, Product> pMap = { for (var p in loadedProducts) p.id : p };
          final List<Product> sorted = [];
          for (var id in order) {
            if (pMap.containsKey(id)) {
              sorted.add(pMap.remove(id)!);
            }
          }
          sorted.addAll(pMap.values);
          loadedProducts = sorted;
        }

        setState(() {
          _categories = loadedCats;
          _banners = loadedBanners;
          _products = loadedProducts;
          _featuredCategories = loadedFeatured;
          _aiProductOrder = order;
          _aiReasons = reasons;
          _hasMore = _products.length == 20;
          _pageNumber = 0;
          _isLoading = false;
        });
      }
    } catch (e, stack) {
      debugPrint('Error loading initial data: $e\n$stack');
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadProducts({bool isLoadMore = false}) async {
    if (isLoadMore && (!_hasMore || _isFetchingMore)) return;

    if (isLoadMore) {
      setState(() => _isFetchingMore = true);
    } else {
      setState(() {
        _isLoading = true;
        _pageNumber = 0;
      });
    }

    final repo = ref.read(dataRepositoryProvider);
    final offset = isLoadMore ? (_pageNumber + 1) * 20 : 0;
    
    final newProducts = await repo.fetchProducts(
      categoryId: _activeFilter == 'all' ? null : _activeFilter,
      orderByPopular: _activeTab == 'popular',
      limit: 20,
      offset: offset,
    );

    if (mounted) {
      setState(() {
        if (isLoadMore) {
          _products.addAll(newProducts);
          _pageNumber++;
        } else {
          _products = newProducts;
        }
        _hasMore = newProducts.length == 20;
        _isLoading = false;
        _isFetchingMore = false;
      });
    }
  }

  Future<void> _loadMoreProducts() async {
    await _loadProducts(isLoadMore: true);
  }

  // Trigger search with query
  Future<void> _executeSearch(String queryText) async {
    if (queryText.trim().isEmpty) {
      _clearSearch();
      return;
    }

    setState(() {
      _isSearchLoading = true;
      _activeFacet = null;
    });

    final repo = ref.read(dataRepositoryProvider);
    final searchData = await repo.searchProducts(queryText);

    if (mounted) {
      setState(() {
        _searchResults = searchData['results'] as List<Product>;
        _searchFacets = searchData['facets'] as Map<String, dynamic>?;
        _didYouMean = searchData['didYouMean']?.toString();
        _isFallback = searchData['isFallback'] as bool;
        _isSearchLoading = false;
      });
    }
  }

  void _onSearchChanged(String val) {
    _debounceTimer?.cancel();
    if (val.trim().isEmpty) {
      _clearSearch();
      return;
    }
    _debounceTimer = Timer(const Duration(milliseconds: 600), () {
      _executeSearch(val);
    });
  }

  void _clearSearch() {
    _searchController.clear();
    _debounceTimer?.cancel();
    setState(() {
      _searchResults = null;
      _searchFacets = null;
      _didYouMean = null;
      _isFallback = false;
      _isSearchLoading = false;
      _activeFacet = null;
    });
  }

  List<Product> _getFilteredProducts() {
    if (_searchResults == null) return _products;
    if (_activeFacet == null) return _searchResults!;
    
    // Filter search results by selected category facet
    return _searchResults!.where((p) => p.category == _activeFacet || p.categoryUz == _activeFacet || p.categoryRu == _activeFacet).toList();
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final displayedProducts = _getFilteredProducts();

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Custom Search & Location Sticky Header
            Container(
              color: AppTheme.surfaceColor,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                children: [
                  // Location and Profile Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            lang == 'ru' ? 'Доставка в' : 'Yetkazib berish',
                            style: const TextStyle(fontSize: 10, color: AppTheme.textSecondaryColor, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 2),
                          const Row(
                            children: [
                              Icon(Icons.location_on, color: AppTheme.primaryColor, size: 14),
                              SizedBox(width: 4),
                              Text(
                                'Toshkent, Yunusobod',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
                              ),
                              Icon(Icons.chevron_right, color: AppTheme.textSecondaryColor, size: 14),
                            ],
                          ),
                        ],
                      ),
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: Colors.grey.shade100,
                        child: const Icon(Icons.person, color: AppTheme.textPrimaryColor, size: 20),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  
                  // Search TextField Input
                  Container(
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        _isSearchLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryColor),
                              )
                            : const Icon(Icons.search, color: AppTheme.textSecondaryColor, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            onChanged: _onSearchChanged,
                            decoration: InputDecoration(
                              hintText: lang == 'ru' ? 'Поиск товаров...' : 'Mahsulot qidirish...',
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              contentPadding: EdgeInsets.zero,
                              hintStyle: const TextStyle(fontSize: 13),
                            ),
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                        if (_searchController.text.isNotEmpty)
                          GestureDetector(
                            onTap: _clearSearch,
                            child: const Icon(Icons.close, color: AppTheme.textSecondaryColor, size: 20),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            // Scrollable Content
            Expanded(
              child: RefreshIndicator(
                color: AppTheme.primaryColor,
                onRefresh: () async {
                  if (_searchResults != null) {
                    await _executeSearch(_searchController.text);
                  } else {
                    await _loadInitialData();
                  }
                },
                child: CustomScrollView(
                  controller: _scrollController,
                  slivers: [
                    if (_searchResults == null)
                      SliverToBoxAdapter(
                        key: const ValueKey('home_feed_headers'),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Stories Bubbles Row
                            const StoriesRow(),

                            // Interactive Catalog CTA Banner
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              child: InkWell(
                                onTap: () => context.push('/catalog'),
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  height: 52,
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [AppTheme.primaryColor, Color(0xFF1F5A30)],
                                    ),
                                    borderRadius: BorderRadius.circular(16),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppTheme.primaryColor.withOpacity(0.25),
                                        blurRadius: 12,
                                        offset: const Offset(0, 4),
                                      )
                                    ],
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 18),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          const Icon(Icons.grid_view_rounded, color: Colors.white, size: 20),
                                          const SizedBox(width: 12),
                                          Text(
                                            lang == 'ru' ? 'Каталог товаров' : 'Mahsulotlar katalogi',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                              letterSpacing: -0.2,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const Icon(Icons.chevron_right_rounded, color: Colors.white, size: 22),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            
                            // HTML / Sliding banners
                            if (_banners.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                child: BannerSection(
                                  banners: _banners,
                                  language: lang,
                                  heightPx: 160,
                                  borderRadius: 20,
                                ),
                              ),

                            // Promo Countdown Flash Sale Card
                            PromoCountdown(
                              language: lang,
                              variant: 'card',
                            ),

                            // Featured Top Categories Grid
                            if (_featuredCategories.isNotEmpty)
                              FeaturedCategories(
                                categories: _featuredCategories,
                                language: lang,
                                onCategoryTap: (catId) {
                                  setState(() {
                                    _activeFilter = catId;
                                  });
                                  _loadProducts();
                                },
                              ),
                            
                            // Categories horizontal chips bar
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: CategoryFilter(
                                allCategories: _categories,
                                activeFilter: _activeFilter,
                                setActiveFilter: (val) {
                                  setState(() {
                                    _activeFilter = val;
                                  });
                                  _loadProducts();
                                },
                                activeParent: _activeParent,
                                setActiveParent: (val) {
                                  setState(() {
                                    _activeParent = val;
                                  });
                                },
                                language: lang,
                                setHomeActiveFilter: (val) {
                                  setState(() {
                                    _activeFilter = val;
                                  });
                                  _loadProducts();
                                },
                              ),
                            ),
                            
                            // Trust Badges Banner
                            TrustStrip(language: lang),
                            
                            // Recently Viewed Slider
                            RecentlyViewed(language: lang),
                            
                            // Popular / For You Tab Selectors
                            Container(
                              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: const BoxDecoration(
                                border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1.5)),
                              ),
                              child: Row(
                                children: [
                                  _buildTabItem('for_you', lang == 'ru' ? 'Для вас' : 'Siz uchun'),
                                  _buildTabItem('popular', lang == 'ru' ? 'Популярное' : 'Ommabop'),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )
                    else ...[
                      // Search Results Header & Facet Categories Filters
                      SliverToBoxAdapter(
                        key: const ValueKey('search_results_headers'),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _isFallback
                                        ? (lang == 'ru' ? 'Точных совпадений нет' : 'Aniq moslik topilmadi')
                                        : (lang == 'ru' ? 'Результаты поиска' : 'Qidiruv natijalari'),
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimaryColor),
                                  ),
                                  TextButton(
                                    onPressed: _clearSearch,
                                    child: Text(lang == 'ru' ? 'Очистить' : 'Tozalash'),
                                  ),
                                ],
                              ),
                              if (_isFallback)
                                Text(
                                  lang == 'ru' ? 'Похожие товары:' : 'Shunga o\'xshash mahsulotlar:',
                                  style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 12),
                                ),
                              if (_didYouMean != null) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Text(
                                      lang == 'ru' ? 'Может быть: ' : 'Balki: ',
                                      style: const TextStyle(fontSize: 13, color: AppTheme.textSecondaryColor),
                                    ),
                                    GestureDetector(
                                      onTap: () {
                                        _searchController.text = _didYouMean!;
                                        _executeSearch(_didYouMean!);
                                      },
                                      child: Text(
                                        _didYouMean!,
                                        style: const TextStyle(fontSize: 13, color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                              
                              // Facets Chips Row
                              if (_searchFacets != null && _searchFacets!['categories'] != null) ...[
                                const SizedBox(height: 12),
                                SizedBox(
                                  height: 38,
                                  child: ListView(
                                    scrollDirection: Axis.horizontal,
                                    children: (_searchFacets!['categories'] as Map<String, dynamic>).entries.map((entry) {
                                      final isSelected = _activeFacet == entry.key;
                                      
                                      // Get localized category name from mapping if present
                                      final Map? catNames = _searchFacets!['categoryNames'] as Map?;
                                      final nameMapping = catNames?[entry.key] as Map?;
                                      final labelName = nameMapping?[lang] ?? entry.key;

                                      return GestureDetector(
                                        onTap: () {
                                          setState(() {
                                            _activeFacet = isSelected ? null : entry.key;
                                          });
                                        },
                                        child: Container(
                                          margin: const EdgeInsets.only(right: 8),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: isSelected ? AppTheme.primaryColor : Colors.grey.shade100,
                                            borderRadius: BorderRadius.circular(18),
                                          ),
                                          alignment: Alignment.center,
                                          child: Text(
                                            '$labelName (${entry.value})',
                                            style: TextStyle(
                                              color: isSelected ? Colors.white : AppTheme.primaryColor,
                                              fontSize: 12,
                                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                            ),
                                          ),
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                    
                    // Main Grid View of Products
                    _isLoading && displayedProducts.isEmpty
                        ? const SliverFillRemaining(
                            key: ValueKey('loading_sliver'),
                            child: Center(
                              child: CircularProgressIndicator(color: AppTheme.primaryColor),
                            ),
                          )
                        : displayedProducts.isEmpty
                            ? SliverFillRemaining(
                                key: const ValueKey('empty_sliver'),
                                child: Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.search_off, size: 64, color: Colors.grey.shade300),
                                      const SizedBox(height: 12),
                                      Text(
                                        lang == 'ru' ? 'Ничего не найдено' : 'Hech narsa topilmadi',
                                        style: const TextStyle(color: AppTheme.textSecondaryColor),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            : SliverPadding(
                                key: const ValueKey('grid_sliver'),
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                sliver: SliverGrid(
                                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 2,
                                    crossAxisSpacing: 12,
                                    mainAxisSpacing: 12,
                                    childAspectRatio: 0.40,
                                  ),
                                  delegate: SliverChildBuilderDelegate(
                                    (context, index) {
                                      final productItem = displayedProducts[index];
                                      final aiReasonText = _aiReasons[productItem.id]?[lang];

                                      return ProductCard(
                                        key: ValueKey(productItem.id),
                                        product: productItem,
                                        aiReason: aiReasonText,
                                      );
                                    },
                                    childCount: displayedProducts.length,
                                  ),
                                ),
                              ),
                    
                    // Fetching More Spinner
                    if (_isFetchingMore)
                      const SliverToBoxAdapter(
                        key: ValueKey('fetching_more_sliver'),
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(
                            child: CircularProgressIndicator(color: AppTheme.primaryColor),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabItem(String tabCode, String label) {
    final isSelected = _activeTab == tabCode;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _activeTab = tabCode;
          });
          _loadProducts();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: isSelected
                ? const Border(bottom: BorderSide(color: AppTheme.primaryColor, width: 2.5))
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppTheme.textPrimaryColor : AppTheme.textSecondaryColor,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }
}

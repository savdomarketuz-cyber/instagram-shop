import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import '../models/product.dart';
import '../models/category.dart';
import '../models/brand.dart';
import '../models/banner.dart';
import '../models/story.dart';
import '../models/reel.dart';
import '../models/comment.dart';
import 'api_client.dart';
import '../supabase/supabase_client.dart';
import 'package:hive_ce/hive_ce.dart';

class DataRepository {
  final sb.SupabaseClient supabase;
  final ApiClient apiClient;

  String? lastProductsError;
  String? lastCategoriesError;
  String? lastBannersError;

  DataRepository({required this.supabase, required this.apiClient});

  // Helper: Stale-While-Revalidate caching
  Future<dynamic> _fetchWithCache(
    String key,
    Future<dynamic> Function() fetcher, {
    bool forceRefresh = false,
  }) async {
    final box = Hive.box('api_cache');
    final cachedData = box.get(key);

    // Orqa fonda jimgina bazani tekshirib keshni yangilaymiz (stale-while-revalidate)
    final backgroundFetch = fetcher().then((data) {
      box.put(key, data);
      box.put('${key}_time', DateTime.now().millisecondsSinceEpoch);
      return data;
    }).catchError((e) {
      debugPrint('Background fetch error for $key: $e');
    });

    // Agar keshda bo'lsa va majburiy yangilash so'ralmasa, keshni darhol qaytaramiz (0 soniyada ochiladi)
    if (cachedData != null && !forceRefresh) {
      return cachedData;
    }

    // Kesh bo'lmasa, tarmoqni kutamiz
    return await backgroundFetch;
  }

  // 1. Fetch Categories
  Future<List<Category>> fetchCategories() async {
    try {
      final response = await _fetchWithCache('categories', () async {
        return await supabase
            .from('categories')
            .select('*')
            .eq('is_deleted', false)
            .order('created_at', ascending: true);
      });
      return (response as List).map((x) => Category.fromJson(Map<String, dynamic>.from(x))).toList();
    } catch (e) {
      debugPrint('Error fetching categories: $e');
      lastCategoriesError = e.toString();
      ApiClient.showToast('Categories error: $e', isError: true);
      return <Category>[];
    }
  }

  static const String productSelectFields = 'id,name,name_uz,name_ru,price,old_price,category_id,category_uz,category_ru,stock,stock_details,image,images,description,description_uz,description_ru,tag,sku,group_id,color_name,sales,is_deleted,article,is_original,brand_id,video_url,created_at,image_metadata,avg_rating,model,review_count,ai_persona,express_delivery';

  // 2. Fetch Products
  Future<List<Product>> fetchProducts({
    String? categoryId,
    String? brandId,
    bool orderByPopular = false,
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      final cacheKey = 'products_${categoryId ?? "all"}_${brandId ?? "all"}_${orderByPopular}_${limit}_$offset';
      
      final response = await _fetchWithCache(cacheKey, () async {
        dynamic query = supabase
            .from('products')
            .select(productSelectFields)
            .eq('is_deleted', false)
            .gt('stock', 0);

        if (categoryId != null && categoryId != 'all') {
          query = query.eq('category_id', categoryId);
        }

        if (brandId != null) {
          query = query.eq('brand_id', brandId);
        }

        if (orderByPopular) {
          query = query.order('sales', ascending: false);
        } else {
          query = query.order('created_at', ascending: false);
        }

        return await query.range(offset, offset + limit - 1);
      });
      
      return (response as List).map((x) => Product.fromJson(Map<String, dynamic>.from(x))).toList();
    } catch (e, stack) {
      debugPrint('Error fetching products: $e\\n$stack');
      lastProductsError = e.toString();
      ApiClient.showToast('Products error: $e', isError: true);
      return <Product>[];
    }
  }

  // 3. Fetch Single Product
  Future<Product?> fetchProductById(String id) async {
    try {
      final response = await _fetchWithCache('product_$id', () async {
        return await supabase
            .from('products')
            .select(productSelectFields)
            .eq('id', id)
            .single();
      });
      return Product.fromJson(Map<String, dynamic>.from(response as Map));
    } catch (e) {
      debugPrint('Error fetching product $id: $e');
      return null;
    }
  }

  // 3.5 Fetch Brands
  Future<List<Brand>> fetchBrands() async {
    try {
      final response = await _fetchWithCache('brands', () async {
        return await supabase
            .from('brands')
            .select('id, name, name_uz, name_ru')
            .eq('is_deleted', false)
            .order('name', ascending: true);
      });
      return (response as List).map((x) => Brand.fromJson(Map<String, dynamic>.from(x))).toList();
    } catch (e) {
      debugPrint('Error fetching brands: $e');
      return <Brand>[];
    }
  }

  // 4. Fetch Promotion Banners
  Future<List<PromotionBanner>> fetchBanners() async {
    try {
      final response = await _fetchWithCache('banners', () async {
        return await supabase
            .from('banners')
            .select('*')
            .eq('active', true)
            .order('order_index', ascending: true);
      });
      return (response as List).map((x) => PromotionBanner.fromJson(Map<String, dynamic>.from(x))).toList();
    } catch (e) {
      debugPrint('Error fetching banners: $e');
      lastBannersError = e.toString();
      ApiClient.showToast('Banners error: $e', isError: true);
      return <PromotionBanner>[];
    }
  }

  // 5. Fetch Stories
  Future<List<Story>> fetchStories() async {
    try {
      final response = await _fetchWithCache('stories', () async {
        return await supabase
            .from('stories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', ascending: true);
      });
      return (response as List).map((x) => Story.fromJson(Map<String, dynamic>.from(x))).toList();
    } catch (e) {
      debugPrint('Error fetching stories: $e');
      return [];
    }
  }

  // 6. Fetch Reels
  Future<List<Reel>> fetchReels() async {
    try {
      final response = await _fetchWithCache('reels', () async {
        return await supabase.from('reels').select('*');
      });
      return (response as List).map((x) => Reel.fromJson(Map<String, dynamic>.from(x))).toList();
    } catch (e) {
      debugPrint('Error fetching reels: $e');
      return [];
    }
  }



  // 7. Fetch Comments/Reviews for a Product
  Future<List<Comment>> fetchProductComments(String productId) async {
    try {
      final response = await _fetchWithCache('product_comments_$productId', () async {
        return await supabase
            .from('comments')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', ascending: false);
      });
      return (response as List).map((x) => Comment.fromJson(Map<String, dynamic>.from(x))).toList();
    } catch (e) {
      debugPrint('Error fetching comments for $productId: $e');
      return [];
    }
  }

  // 8. Search Products via Next.js Endpoint
  Future<Map<String, dynamic>> searchProducts(String queryText, {String? userPhone}) async {
    try {
      final response = await apiClient.dio.post('/api/search', data: {
        'query': queryText,
        if (userPhone != null) 'userPhone': userPhone,
      });
      
      final data = response.data as Map<String, dynamic>;
      final List resultsJson = data['results'] ?? [];
      final results = resultsJson.map((x) => Product.fromJson(x as Map<String, dynamic>)).toList();
      
      return {
        'results': results,
        'facets': data['facets'],
        'didYouMean': data['didYouMean'],
        'isFallback': data['isFallback'] ?? false,
      };
    } catch (e) {
      debugPrint('Error searching products: $e');
      return {
        'results': <Product>[],
        'facets': null,
        'didYouMean': null,
        'isFallback': false,
      };
    }
  }

  // 9. Personalize Products via AI Next.js Endpoint
  Future<List<String>> fetchAIPersonalizedProductIds(List<String> attentionIds) async {
    try {
      final response = await apiClient.dio.post('/api/ai/personalize', data: {
        'attentionIds': attentionIds,
        'limit': 24,
      });
      final data = response.data as Map<String, dynamic>;
      final List results = data['results'] ?? [];
      return results.map((r) => r['id'].toString()).toList();
    } catch (e) {
      debugPrint('Error fetching AI personalization: $e');
      return [];
    }
  }

  // 10. Fetch Product Specifications
  Future<List<Map<String, String>>> fetchProductSpecifications(String productId) async {
    try {
      final response = await apiClient.dio.get('/api/admin/product-params', queryParameters: {
        'product_id': productId,
      });
      final data = response.data['data'] as List?;
      if (data == null) return [];
      
      return data
          .where((d) => d['value'] != null && d['value'].toString().trim().isNotEmpty)
          .map((d) {
            final catParams = d['category_params'] as Map?;
            final name = catParams?['name']?.toString() ?? '';
            final nameUz = catParams?['name_uz']?.toString() ?? name;
            final nameRu = catParams?['name_ru']?.toString() ?? name;
            final value = d['value']?.toString() ?? '';
            return {
              'name': name,
              'name_uz': nameUz,
              'name_ru': nameRu,
              'value': value,
            };
          }).toList();
    } catch (e) {
      debugPrint('Error fetching product specifications: $e');
      return [];
    }
  }

  // Fetch Warehouses
  Future<List<Map<String, dynamic>>> fetchWarehouses() async {
    try {
      final response = await _fetchWithCache('warehouses', () async {
        return await supabase
            .from('warehouses')
            .select('*');
      });
      return (response as List).map((x) => Map<String, dynamic>.from(x)).toList();
    } catch (e) {
      debugPrint('Error fetching warehouses: $e');
      return [];
    }
  }

  // Fetch Featured Categories
  Future<List<Category>> fetchFeaturedCategories() async {
    try {
      final response = await _fetchWithCache('featured_categories', () async {
        final settingsRes = await supabase
            .from('settings')
            .select('data')
            .eq('id', 'featured_categories')
            .maybeSingle();

        if (settingsRes == null || settingsRes['data'] == null) return <dynamic>[];
        final Map<String, dynamic> data = Map<String, dynamic>.from(settingsRes['data']);
        final bool showOnHome = data['show_on_home'] ?? true;
        final List<dynamic> rawIds = data['category_ids'] ?? [];
        final List<String> ids = rawIds.map((e) => e.toString()).toList();

        if (!showOnHome || ids.isEmpty) return <dynamic>[];

        final catsRes = await supabase
            .from('categories')
            .select('*')
            .inFilter('id', ids)
            .eq('is_deleted', false);

        return catsRes ?? <dynamic>[];
      });

      return (response as List).map((x) => Category.fromJson(Map<String, dynamic>.from(x))).toList();
    } catch (e) {
      debugPrint('Error fetching featured categories: $e');
      return <Category>[];
    }
  }

  // Fetch AI Personalized recommendations
  Future<Map<String, dynamic>> fetchPersonalizedProducts({
    List<String>? attentionIds,
    String? lastSearch,
    String? userPhone,
    int limit = 24,
  }) async {
    try {
      final res = await apiClient.dio.post(
        '/api/ai/personalize',
        data: {
          'attentionIds': attentionIds ?? [],
          'lastSearch': lastSearch ?? '',
          'userPhone': userPhone,
          'limit': limit,
        },
      );

      if (res.statusCode == 200 && res.data != null && res.data['success'] == true) {
        final results = res.data['results'] as List<dynamic>? ?? [];
        final Map<String, Map<String, String>> reasons = {};
        final List<String> order = [];
        for (var r in results) {
          final id = r['id']?.toString();
          if (id != null) {
            order.add(id);
            reasons[id] = {
              'uz': r['reason_uz']?.toString() ?? '',
              'ru': r['reason_ru']?.toString() ?? '',
            };
          }
        }
        return {'order': order, 'reasons': reasons};
      }
    } catch (e) {
      debugPrint('Error fetching personalized recommendations: $e');
    }
    return {'order': <String>[], 'reasons': <String, Map<String, String>>{}};
  }
}

// Riverpod Provider
final dataRepositoryProvider = Provider<DataRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final apiClient = ref.watch(apiClientProvider);
  return DataRepository(supabase: supabase, apiClient: apiClient);
});

final warehousesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(dataRepositoryProvider);
  return repo.fetchWarehouses();
});

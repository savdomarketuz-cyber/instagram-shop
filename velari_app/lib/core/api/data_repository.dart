import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import '../models/product.dart';
import '../models/category.dart';
import '../models/banner.dart';
import '../models/story.dart';
import '../models/reel.dart';
import '../models/comment.dart';
import 'api_client.dart';
import '../supabase/supabase_client.dart';

class DataRepository {
  final sb.SupabaseClient supabase;
  final ApiClient apiClient;

  DataRepository({required this.supabase, required this.apiClient});

  // 1. Fetch Categories
  Future<List<Category>> fetchCategories() async {
    try {
      final response = await supabase
          .from('categories')
          .select('*')
          .eq('is_deleted', false)
          .order('created_at', ascending: true);
      return (response as List).map((x) => Category.fromJson(x as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('Error fetching categories: $e');
      ApiClient.showToast('Categories error: $e', isError: true);
      return [];
    }
  }

  // 2. Fetch Products
  Future<List<Product>> fetchProducts({
    String? categoryId,
    String? brandId,
    bool orderByPopular = false,
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      dynamic query = supabase
          .from('products')
          .select('*')
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

      final response = await query.range(offset, offset + limit - 1);
      return (response as List).map((x) => Product.fromJson(x as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('Error fetching products: $e');
      ApiClient.showToast('Products error: $e', isError: true);
      return [];
    }
  }

  // 3. Fetch Single Product
  Future<Product?> fetchProductById(String id) async {
    try {
      final response = await supabase.from('products').select('*').eq('id', id).single();
      return Product.fromJson(response);
    } catch (e) {
      debugPrint('Error fetching product $id: $e');
      return null;
    }
  }

  // 4. Fetch Promotion Banners
  Future<List<PromotionBanner>> fetchBanners() async {
    try {
      final response = await supabase
          .from('banners')
          .select('*')
          .eq('active', true)
          .order('order_index', ascending: true);
      return (response as List).map((x) => PromotionBanner.fromJson(x as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('Error fetching banners: $e');
      ApiClient.showToast('Banners error: $e', isError: true);
      return [];
    }
  }

  // 5. Fetch Stories
  Future<List<Story>> fetchStories() async {
    try {
      final response = await supabase
          .from('stories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', ascending: true);
      return (response as List).map((x) => Story.fromJson(x as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('Error fetching stories: $e');
      return [];
    }
  }

  // 6. Fetch Reels
  Future<List<Reel>> fetchReels() async {
    try {
      final response = await supabase.from('reels').select('*');
      return (response as List).map((x) => Reel.fromJson(x as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('Error fetching reels: $e');
      return [];
    }
  }

  // 7. Fetch Comments/Reviews for a Product
  Future<List<Comment>> fetchProductComments(String productId) async {
    try {
      final response = await supabase
          .from('comments')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', ascending: false);
      return (response as List).map((x) => Comment.fromJson(x as Map<String, dynamic>)).toList();
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
}

// Riverpod Provider
final dataRepositoryProvider = Provider<DataRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final apiClient = ref.watch(apiClientProvider);
  return DataRepository(supabase: supabase, apiClient: apiClient);
});

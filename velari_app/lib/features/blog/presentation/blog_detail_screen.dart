import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/models/product.dart';

import '../../../core/api/data_repository.dart';

class BlogDetailScreen extends ConsumerStatefulWidget {
  final String slug;

  const BlogDetailScreen({super.key, required this.slug});

  @override
  ConsumerState<BlogDetailScreen> createState() => _BlogDetailScreenState();
}

class _BlogDetailScreenState extends ConsumerState<BlogDetailScreen> {
  Map<String, dynamic>? _post;
  List<Product> _linkedProducts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchBlogPostDetails();
  }

  Future<void> _fetchBlogPostDetails() async {
    try {
      final supabase = ref.read(supabaseClientProvider);
      
      // 1. Fetch Post details
      final response = await supabase
          .from('blogs')
          .select('*')
          .eq('slug', widget.slug)
          .eq('is_deleted', false)
          .maybeSingle();

      if (response != null) {
        setState(() {
          _post = response as Map<String, dynamic>;
        });

        // 2. Fetch Linked Products
        final List? linkedIds = _post!['linked_product_ids'] as List?;
        if (linkedIds != null && linkedIds.isNotEmpty) {
          final pRes = await supabase
              .from('products')
              .select(DataRepository.productSelectFields)
              .inFilter('id', linkedIds)
              .eq('is_deleted', false);

          if (pRes != null) {
            setState(() {
              _linkedProducts = (pRes as List).map((x) => Product.fromJson(x as Map<String, dynamic>)).toList();
            });
          }
        }

        // 3. Increment Views count in the database
        final int currentViews = _post!['views'] ?? 0;
        await supabase
            .from('blogs')
            .update({'views': currentViews + 1})
            .eq('id', _post!['id']);
      }
    } catch (e) {
      debugPrint("Error loading blog details: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString);
      return "${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}.${dt.year}";
    } catch (_) {
      return "";
    }
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
    final lang = ref.watch(localeProvider);

    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFFFAFAF6),
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryColor),
        ),
      );
    }

    if (_post == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Text(
            lang == 'ru' ? 'Статья не найдена' : 'Maqola topilmadi',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
      );
    }

    final title = lang == 'ru' ? (_post!['title_ru'] ?? _post!['title_uz'] ?? '') : (_post!['title_uz'] ?? _post!['title_ru'] ?? '');
    final content = lang == 'ru' ? (_post!['content_ru'] ?? _post!['content_uz'] ?? '') : (_post!['content_uz'] ?? _post!['content_ru'] ?? '');
    final category = _post!['category'] ?? 'INSIGHTS';
    final readTime = _post!['read_time'] ?? '5';
    final dateStr = _formatDate(_post!['created_at'] ?? '');
    final views = _post!['views'] ?? 0;
    final image = _post!['image'];

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      body: CustomScrollView(
        slivers: [
          // Premium sliver app bar with blog cover photo
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: AppTheme.primaryColor,
            elevation: 0,
            leading: GestureDetector(
              onTap: () => context.pop(),
              child: Container(
                margin: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.arrow_back, color: AppTheme.textPrimaryColor),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  if (image != null && image.toString().isNotEmpty)
                    Image.network(
                      image,
                      fit: BoxFit.cover,
                    )
                  else
                    Container(color: const Color(0xFFEAF3EC)),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.black54, Colors.transparent, Colors.black54],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Main body content
          SliverPadding(
            padding: const EdgeInsets.all(20),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Category Chip
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        category.toUpperCase(),
                        style: const TextStyle(
                          color: AppTheme.primaryColor,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Title
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    fontStyle: FontStyle.italic,
                    color: AppTheme.textPrimaryColor,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 12),

                // Meta row
                Row(
                  children: [
                    Icon(Icons.calendar_today, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(
                      dateStr,
                      style: TextStyle(color: Colors.grey.shade400, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 14),
                    Icon(Icons.access_time, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(
                      "$readTime min",
                      style: TextStyle(color: Colors.grey.shade400, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 14),
                    Icon(Icons.remove_red_eye_outlined, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(
                      views.toString(),
                      style: TextStyle(color: Colors.grey.shade400, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const Divider(height: 32, thickness: 1),

                // Article Content
                Text(
                  content,
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.6,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.textPrimaryColor,
                  ),
                ),
                const SizedBox(height: 30),

                // Related products section
                if (_linkedProducts.isNotEmpty) ...[
                  const Divider(height: 40, thickness: 1),
                  Text(
                    lang == 'ru' ? 'СВЯЗАННЫЕ ТОВАРЫ' : 'BOGʻLANGAN MAHSULOTLAR',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade400,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 190,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _linkedProducts.length,
                      itemBuilder: (context, index) {
                        final p = _linkedProducts[index];
                        final pName = lang == 'ru' ? (p.nameRu ?? p.name) : (p.nameUz ?? p.name);

                        return Container(
                          width: 130,
                          margin: const EdgeInsets.only(right: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.black.withOpacity(0.03)),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () => context.push('/products/${p.id}'),
                                child: Padding(
                                  padding: const EdgeInsets.all(8),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: p.image.isNotEmpty
                                            ? ClipRRect(
                                                borderRadius: BorderRadius.circular(12),
                                                child: Image.network(
                                                  p.image,
                                                  width: double.infinity,
                                                  fit: BoxFit.cover,
                                                ),
                                              )
                                            : Container(color: const Color(0xFFEAF3EC)),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        pName,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, height: 1.2),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _formatPrice(p.price, lang),
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppTheme.primaryColor),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
                const SizedBox(height: 40),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

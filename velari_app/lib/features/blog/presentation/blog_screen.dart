import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/supabase/supabase_client.dart';

class BlogScreen extends ConsumerStatefulWidget {
  const BlogScreen({super.key});

  @override
  ConsumerState<BlogScreen> createState() => _BlogScreenState();
}

class _BlogScreenState extends ConsumerState<BlogScreen> {
  List<dynamic> _posts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchBlogPosts();
  }

  Future<void> _fetchBlogPosts() async {
    try {
      final supabase = ref.read(supabaseClientProvider);
      final response = await supabase
          .from('blogs')
          .select('*')
          .eq('is_deleted', false)
          .order('created_at', ascending: false);

      setState(() {
        _posts = response as List;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint("Error loading blog posts: $e");
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

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        title: Text(lang == 'ru' ? 'Блог' : 'Blog'),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: AppTheme.textPrimaryColor,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
          : _posts.isEmpty
              ? Center(
                  child: Text(
                    lang == 'ru' ? 'Статей пока нет' : 'Hozircha maqolalar yoʻq',
                    style: TextStyle(color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _posts.length,
                  itemBuilder: (context, index) {
                    final post = _posts[index];
                    final title = lang == 'ru' ? (post['title_ru'] ?? post['title_uz'] ?? '') : (post['title_uz'] ?? post['title_ru'] ?? '');
                    final excerpt = lang == 'ru' ? (post['excerpt_ru'] ?? post['excerpt_uz'] ?? '') : (post['excerpt_uz'] ?? post['excerpt_ru'] ?? '');
                    final readTime = post['read_time'] ?? '5';
                    final category = post['category'] ?? 'INSIGHTS';
                    final views = post['views'] ?? 0;
                    final image = post['image'];

                    return Container(
                      margin: const EdgeInsets.only(bottom: 20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(color: Colors.black.withOpacity(0.04)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.015),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(28),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              context.push('/blog/${post['slug']}');
                            },
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Image
                                AspectRatio(
                                  aspectRatio: 16 / 10,
                                  child: Stack(
                                    children: [
                                      if (image != null && image.toString().isNotEmpty)
                                        Image.network(
                                          image,
                                          width: double.infinity,
                                          height: double.infinity,
                                          fit: BoxFit.cover,
                                          errorBuilder: (c, o, s) => Container(color: const Color(0xFFEAF3EC)),
                                        )
                                      else
                                        Container(color: const Color(0xFFEAF3EC)),
                                      Positioned(
                                        top: 16,
                                        left: 16,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                          decoration: BoxDecoration(
                                            color: Colors.white.withOpacity(0.9),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            category.toUpperCase(),
                                            style: const TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w900,
                                              color: AppTheme.primaryColor,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                // Text details
                                Padding(
                                  padding: const EdgeInsets.all(20),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Meta details
                                      Row(
                                        children: [
                                          Icon(Icons.calendar_today, size: 12, color: Colors.grey.shade400),
                                          const SizedBox(width: 4),
                                          Text(
                                            _formatDate(post['created_at'] ?? ''),
                                            style: TextStyle(color: Colors.grey.shade400, fontSize: 10, fontWeight: FontWeight.bold),
                                          ),
                                          const SizedBox(width: 14),
                                          Icon(Icons.access_time, size: 12, color: Colors.grey.shade400),
                                          const SizedBox(width: 4),
                                          Text(
                                            "$readTime min",
                                            style: TextStyle(color: Colors.grey.shade400, fontSize: 10, fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      // Title
                                      Text(
                                        title,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w900,
                                          fontStyle: FontStyle.italic,
                                          color: AppTheme.textPrimaryColor,
                                          height: 1.25,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      // Excerpt
                                      if (excerpt.isNotEmpty)
                                        Text(
                                          excerpt,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: AppTheme.textSecondaryColor,
                                            height: 1.4,
                                          ),
                                        ),
                                      const SizedBox(height: 16),
                                      // Footer row
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              Text(
                                                lang == 'ru' ? 'Читать полностью' : 'Batafsil',
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w900,
                                                  color: AppTheme.primaryColor,
                                                ),
                                              ),
                                              const SizedBox(width: 4),
                                              const Icon(Icons.arrow_forward, size: 12, color: AppTheme.primaryColor),
                                            ],
                                          ),
                                          Row(
                                            children: [
                                              Icon(Icons.remove_red_eye_outlined, size: 12, color: Colors.grey.shade300),
                                              const SizedBox(width: 4),
                                              Text(
                                                views.toString(),
                                                style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

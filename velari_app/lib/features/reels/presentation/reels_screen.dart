import 'package:flutter/material.dart';
import 'package:visibility_detector/visibility_detector.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';
import 'package:uuid/uuid.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/api/api_client.dart';

import '../../../core/api/data_repository.dart';

class ReelsScreen extends ConsumerStatefulWidget {
  const ReelsScreen({super.key});

  @override
  ConsumerState<ReelsScreen> createState() => _ReelsScreenState();
}

class _ReelsScreenState extends ConsumerState<ReelsScreen> {
  final List<Map<String, dynamic>> _reels = [];
  bool _isLoading = true;
  int _activeIndex = 0;
  bool _isMuted = false;

  @override
  void initState() {
    super.initState();
    _fetchReelsData();
  }

  Future<void> _fetchReelsData() async {
    try {
      final supabase = ref.read(supabaseClientProvider);
      
      final reelsRes = await supabase.from('reels').select('*').limit(20);
      final productsRes = await supabase
          .from('products')
          .select(DataRepository.productSelectFields)
          .not('video_url', 'is', null)
          .neq('video_url', '')
          .limit(20);

      final List<Map<String, dynamic>> items = [];

      if (reelsRes != null) {
        for (final r in reelsRes as List) {
          items.add({
            'id': r['id']?.toString() ?? '',
            'videoUrl': r['video_url']?.toString() ?? '',
            'likesCount': (r['likes_count'] as num?)?.toInt() ?? 0,
            'commentCount': (r['comment_count'] as num?)?.toInt() ?? 0,
            'productId': r['product_id']?.toString(),
            'name': r['name']?.toString() ?? '',
            'price': (r['price'] as num?)?.toDouble() ?? 0.0,
            'image': r['image']?.toString() ?? '',
          });
        }
      }

      if (productsRes != null) {
        final seenProductIds = items.map((x) => x['productId']).toSet();
        for (final p in productsRes as List) {
          final pid = p['id']?.toString() ?? '';
          if (!seenProductIds.contains(pid)) {
            items.add({
              'id': pid,
              'videoUrl': p['video_url']?.toString() ?? '',
              'likesCount': 0,
              'commentCount': 0,
              'productId': pid,
              'name': p['name']?.toString() ?? '',
              'price': (p['price'] as num?)?.toDouble() ?? 0.0,
              'image': p['image']?.toString() ?? '',
            });
          }
        }
      }

      // Randomize
      items.shuffle();

      setState(() {
        _reels.addAll(items);
        _isLoading = false;
      });
    } catch (e) {
      debugPrint("Error loading reels: $e");
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    if (_reels.isEmpty) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Text(
            context.tr('common.noProducts', ref),
            style: const TextStyle(color: Colors.white),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            scrollDirection: Axis.vertical,
            itemCount: _reels.length,
            onPageChanged: (index) {
              setState(() {
                _activeIndex = index;
              });
            },
            itemBuilder: (context, index) {
              final reel = _reels[index];
              final isActive = index == _activeIndex;

              return ReelPageItem(
                reel: reel,
                isActive: isActive,
                isMuted: _isMuted,
                onMuteToggle: () {
                  setState(() {
                    _isMuted = !_isMuted;
                  });
                },
              );
            },
          ),
          // Top Bar Overlay
          Positioned(
            top: 48,
            left: 16,
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => context.pop(),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.3),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.arrow_back, color: Colors.white),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  context.tr('reels.title', ref).toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    fontStyle: FontStyle.italic,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ReelPageItem extends ConsumerStatefulWidget {
  final Map<String, dynamic> reel;
  final bool isActive;
  final bool isMuted;
  final VoidCallback onMuteToggle;

  const ReelPageItem({
    super.key,
    required this.reel,
    required this.isActive,
    required this.isMuted,
    required this.onMuteToggle,
  });

  @override
  ConsumerState<ReelPageItem> createState() => _ReelPageItemState();
}

class _ReelPageItemState extends ConsumerState<ReelPageItem> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _hasError = false;
  bool _liked = false;
  bool _isVisible = true;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  @override
  void didUpdateWidget(covariant ReelPageItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_controller != null) {
      if (widget.isActive && _isVisible) {
        _controller!.play();
      } else {
        _controller!.pause();
      }
      _controller!.setVolume(widget.isMuted ? 0.0 : 1.0);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initializePlayer() async {
    final url = widget.reel['videoUrl'] as String;
    if (url.isEmpty) {
      setState(() => _hasError = true);
      return;
    }

    try {
      _controller = VideoPlayerController.networkUrl(Uri.parse(url));
      await _controller!.initialize();
      _controller!.setLooping(true);
      _controller!.setVolume(widget.isMuted ? 0.0 : 1.0);
      
      if (widget.isActive && _isVisible) {
        _controller!.play();
      }

      setState(() {
        _isInitialized = true;
      });
    } catch (e) {
      debugPrint("Error initializing video: $e");
      setState(() => _hasError = true);
    }
  }

  void _openComments() {
    final productId = widget.reel['productId'] ?? widget.reel['id'];
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ReelCommentsSheet(productId: productId),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final isImage = widget.reel['image'] != null && widget.reel['image'].isNotEmpty;

    return VisibilityDetector(
      key: Key('reel_${widget.reel['id']}'),
      onVisibilityChanged: (info) {
        _isVisible = info.visibleFraction > 0.5;
        if (_controller != null) {
          if (_isVisible && widget.isActive) {
            _controller!.play();
          } else {
            _controller!.pause();
          }
        }
      },
      child: Stack(
      children: [
        // Video View
        GestureDetector(
          onTap: () {
            if (_controller != null) {
              if (_controller!.value.isPlaying) {
                _controller!.pause();
              } else {
                _controller!.play();
              }
            }
          },
          onDoubleTap: () {
            setState(() {
              _liked = true;
            });
            // Show premium overlay animation
          },
          child: Container(
            color: Colors.black,
            width: double.infinity,
            height: double.infinity,
            alignment: Alignment.center,
            child: _hasError
                ? const Icon(Icons.error_outline, color: Colors.white, size: 48)
                : _isInitialized
                    ? Center(
                        child: AspectRatio(
                          aspectRatio: _controller!.value.aspectRatio,
                          child: VideoPlayer(_controller!),
                        ),
                      )
                    : const CircularProgressIndicator(color: Colors.white),
          ),
        ),

        // Mute state indicator
        if (widget.isMuted)
          Align(
            alignment: Alignment.center,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.5),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.volume_off, color: Colors.white, size: 36),
            ),
          ),

        // Right Action Overlay Column
        Positioned(
          right: 16,
          bottom: 120,
          child: Column(
            children: [
              // Like
              GestureDetector(
                onTap: () {
                  setState(() {
                    _liked = !_liked;
                  });
                },
                child: Column(
                  children: [
                    Icon(
                      _liked ? Icons.favorite : Icons.favorite_border,
                      color: _liked ? Colors.red : Colors.white,
                      size: 32,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${widget.reel['likesCount'] + (_liked ? 1 : 0)}',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Comment
              GestureDetector(
                onTap: _openComments,
                child: Column(
                  children: [
                    const Icon(Icons.comment, color: Colors.white, size: 32),
                    const SizedBox(height: 4),
                    Text(
                      '${widget.reel['commentCount']}',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Audio Toggle
              GestureDetector(
                onTap: widget.onMuteToggle,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.4),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    widget.isMuted ? Icons.volume_off : Icons.volume_up,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Bottom Info Card (Product card)
        Positioned(
          left: 16,
          right: 80,
          bottom: 32,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.reel['name'],
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  shadows: [Shadow(color: Colors.black54, blurRadius: 4)],
                ),
              ),
              const SizedBox(height: 12),
              // Product navigates to detail
              if (widget.reel['productId'] != null)
                GestureDetector(
                  onTap: () {
                    if (_controller != null) _controller!.pause();
                    context.push('/products/${widget.reel['productId']}');
                  },
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isImage)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              widget.reel['image'],
                              width: 36,
                              height: 36,
                              fit: BoxFit.cover,
                            ),
                          ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr('common.buyNow', ref),
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _formatPrice(widget.reel['price'], lang),
                              style: const TextStyle(color: Colors.white70, fontSize: 10),
                            ),
                          ],
                        ),
                        const SizedBox(width: 12),
                        const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 12),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
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
}

class ReelCommentsSheet extends ConsumerStatefulWidget {
  final String productId;

  const ReelCommentsSheet({super.key, required this.productId});

  @override
  ConsumerState<ReelCommentsSheet> createState() => _ReelCommentsSheetState();
}

class _ReelCommentsSheetState extends ConsumerState<ReelCommentsSheet> {
  final _commentController = TextEditingController();
  final List<Map<String, dynamic>> _comments = [];
  bool _loading = true;
  bool _isPosting = false;

  @override
  void initState() {
    super.initState();
    _fetchComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _fetchComments() async {
    try {
      final supabase = ref.read(supabaseClientProvider);
      final response = await supabase
          .from('comments')
          .select('*')
          .eq('product_id', widget.productId)
          .order('created_at', ascending: false);

      setState(() {
        _comments.clear();
        if (response != null) {
          for (final c in response as List) {
            _comments.add({
              'id': c['id']?.toString() ?? '',
              'username': c['username']?.toString() ?? '',
              'text': c['text']?.toString() ?? '',
              'timestamp': c['created_at'] != null ? DateTime.parse(c['created_at']) : DateTime.now(),
            });
          }
        }
        _loading = false;
      });
    } catch (e) {
      debugPrint("Error loading comments: $e");
      setState(() => _loading = false);
    }
  }

  Future<void> _postComment() async {
    final user = ref.read(authProvider);
    final text = _commentController.text.trim();

    if (user == null) {
      ApiClient.showToast(ref.watch(localeProvider) == 'ru' ? "Войдите в систему" : "Tizimga kiring", isError: true);
      return;
    }

    if (text.isEmpty) return;

    setState(() => _isPosting = true);

    try {
      final supabase = ref.read(supabaseClientProvider);
      final commentId = const Uuid().v4();
      final lang = ref.watch(localeProvider);

      await supabase.from('comments').insert({
        'id': commentId,
        'product_id': widget.productId,
        'user_id': user.phone,
        'username': user.username.isNotEmpty ? user.username : (lang == 'ru' ? "Клиент" : "Mijoz"),
        'text': text,
        'type': 'review',
      });

      _commentController.clear();
      _fetchComments();
    } catch (e) {
      debugPrint("Error posting comment: $e");
    } finally {
      setState(() => _isPosting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final lang = ref.watch(localeProvider);

    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, bottomInset + 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "${context.tr('reels.comments', ref)} (${_comments.length})",
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Comments List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                : _comments.isEmpty
                    ? Center(
                        child: Text(
                          context.tr('reels.noComments', ref),
                          style: TextStyle(color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _comments.length,
                        itemBuilder: (context, index) {
                          final c = _comments[index];
                          final date = c['timestamp'] as DateTime;
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CircleAvatar(
                                  radius: 18,
                                  backgroundColor: Colors.grey.shade100,
                                  child: Text(
                                    c['username'].isNotEmpty ? c['username'][0].toUpperCase() : 'U',
                                    style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            c['username'],
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            "${date.day}.${date.month}.${date.year}",
                                            style: const TextStyle(color: Colors.grey, fontSize: 10),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        c['text'],
                                        style: const TextStyle(fontSize: 13, color: AppTheme.textPrimaryColor),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
          const SizedBox(height: 12),

          // Comment Input
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _commentController,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    hintText: context.tr('reels.writeComment', ref),
                    hintStyle: TextStyle(color: Colors.grey.shade300, fontWeight: FontWeight.normal),
                    filled: true,
                    fillColor: const Color(0xFFF5F5F0),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              GestureDetector(
                onTap: _isPosting ? null : _postComment,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: const BoxDecoration(
                    color: AppTheme.primaryColor,
                    shape: BoxShape.circle,
                  ),
                  child: _isPosting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(Icons.send, color: Colors.white, size: 20),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

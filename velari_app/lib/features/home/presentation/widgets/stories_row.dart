import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';
import 'package:hive_ce/hive_ce.dart';
import '../../../../core/api/data_repository.dart';
import '../../../../core/models/story.dart';
import '../../../../core/l10n/localization.dart';
import '../../../../core/theme/app_theme.dart';

class StoriesRow extends ConsumerStatefulWidget {
  const StoriesRow({super.key});

  @override
  ConsumerState<StoriesRow> createState() => _StoriesRowState();
}

class _StoriesRowState extends ConsumerState<StoriesRow> {
  List<StoryGroup> _groups = [];
  bool _isLoading = true;
  final Set<String> _seenIds = {};
  late Box _settingsBox;

  @override
  void initState() {
    super.initState();
    _settingsBox = Hive.box('settings');
    _loadSeenStories();
    _loadStories();
  }

  void _loadSeenStories() {
    final list = _settingsBox.get('seen_stories', defaultValue: []);
    if (list is List) {
      _seenIds.addAll(list.map((e) => e.toString()).cast<String>());
    }
  }

  void _markStorySeen(String id) {
    if (!_seenIds.contains(id)) {
      setState(() {
        _seenIds.add(id);
      });
      _settingsBox.put('seen_stories', _seenIds.toList());
    }
  }

  Future<void> _loadStories() async {
    final repo = ref.read(dataRepositoryProvider);
    final stories = await repo.fetchStories();
    
    if (stories.isEmpty) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    // Group stories by group_key
    final Map<String, List<Story>> map = {};
    final List<String> order = [];
    
    for (final s in stories) {
      final key = s.groupKey != null && s.groupKey!.trim().isNotEmpty
          ? s.groupKey!.trim()
          : '__solo_${s.id}';
      if (!map.containsKey(key)) {
        map[key] = [];
        order.add(key);
      }
      map[key]!.add(s);
    }

    final List<StoryGroup> built = order.map((key) {
      final slides = map[key]!;
      final first = slides[0];
      final cover = slides.firstWhere((x) => x.image.isNotEmpty, orElse: () => first).image;
      return StoryGroup(
        key: key,
        coverImage: cover,
        coverIsVideo: cover.isEmpty && first.video != null,
        titleUz: first.groupTitleUz?.trim().isNotEmpty == true ? first.groupTitleUz! : first.titleUz,
        titleRu: first.groupTitleRu?.trim().isNotEmpty == true ? first.groupTitleRu! : first.titleRu,
        slides: slides,
      );
    }).toList();

    if (mounted) {
      setState(() {
        _groups = built;
        _isLoading = false;
      });
    }
  }

  void _openStoryViewer(int startGroupIndex) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        pageBuilder: (context, animation, secondaryAnimation) {
          return StoryViewerScreen(
            groups: _groups,
            initialGroupIndex: startGroupIndex,
            seenIds: _seenIds,
            onStorySeen: _markStorySeen,
          );
        },
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const SizedBox(
        height: 110,
        child: Center(
          child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryColor),
        ),
      );
    }

    if (_groups.isEmpty) return const SizedBox.shrink();

    final lang = ref.watch(localeProvider);

    return SizedBox(
      height: 115,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        scrollDirection: Axis.horizontal,
        itemCount: _groups.length,
        itemBuilder: (context, index) {
          final g = _groups[index];
          final seen = g.slides.every((s) => _seenIds.contains(s.id));
          final name = g.getLocalizedTitle(lang);

          return GestureDetector(
            onTap: () => _openStoryViewer(index),
            child: Container(
              margin: const EdgeInsets.only(right: 14),
              child: Column(
                children: [
                  // Bubble Avatar
                  Container(
                    width: 72,
                    height: 72,
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: seen
                          ? const LinearGradient(colors: [Colors.grey, Colors.grey])
                          : const SweepGradient(
                              colors: [
                                AppTheme.primaryColor,
                                Color(0xFF7DC492),
                                AppTheme.primaryColor,
                              ],
                            ),
                    ),
                    child: Container(
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                      ),
                      padding: const EdgeInsets.all(2),
                      child: Container(
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: CachedNetworkImage(
                          imageUrl: g.coverImage,
                          fit: BoxFit.cover,
                          errorWidget: (context, url, error) => Container(
                            color: Colors.grey.shade200,
                            child: const Icon(Icons.play_arrow, color: AppTheme.primaryColor),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  
                  // Title
                  SizedBox(
                    width: 72,
                    child: Text(
                      name,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: seen ? FontWeight.w500 : FontWeight.w700,
                        color: seen ? AppTheme.textSecondaryColor : AppTheme.textPrimaryColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// Full-screen Story Viewer Widget
class StoryViewerScreen extends ConsumerStatefulWidget {
  final List<StoryGroup> groups;
  final int initialGroupIndex;
  final Set<String> seenIds;
  final Function(String) onStorySeen;

  const StoryViewerScreen({
    super.key,
    required this.groups,
    required this.initialGroupIndex,
    required this.seenIds,
    required this.onStorySeen,
  });

  @override
  ConsumerState<StoryViewerScreen> createState() => _StoryViewerScreenState();
}

class _StoryViewerScreenState extends ConsumerState<StoryViewerScreen> with SingleTickerProviderStateMixin {
  late int _currentGroupIndex;
  late int _currentSlideIndex;
  
  Timer? _slideTimer;
  double _slideProgress = 0.0;
  bool _isHolding = false;
  late DateTime _slideStartTime;
  double _elapsedBeforePause = 0.0;
  static const int slideDurationMs = 5000;

  @override
  void initState() {
    super.initState();
    _currentGroupIndex = widget.initialGroupIndex;
    _currentSlideIndex = 0;
    _startStory();
  }

  void _startStory() {
    final story = widget.groups[_currentGroupIndex].slides[_currentSlideIndex];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.onStorySeen(story.id);
    });
    _slideProgress = 0.0;
    _elapsedBeforePause = 0.0;
    _slideStartTime = DateTime.now();
    _startTimer(slideDurationMs);
  }

  void _startTimer(int durationMs) {
    _slideTimer?.cancel();
    const tickMs = 30;
    
    _slideTimer = Timer.periodic(const Duration(milliseconds: tickMs), (timer) {
      if (_isHolding) return;
      
      final elapsed = DateTime.now().difference(_slideStartTime).inMilliseconds + _elapsedBeforePause;
      setState(() {
        _slideProgress = (elapsed / durationMs).clamp(0.0, 1.0);
      });

      if (elapsed >= durationMs) {
        timer.cancel();
        _nextSlide();
      }
    });
  }

  void _pauseTimer() {
    setState(() {
      _isHolding = true;
    });
    _slideTimer?.cancel();
    _elapsedBeforePause += DateTime.now().difference(_slideStartTime).inMilliseconds;
  }

  void _resumeTimer() {
    setState(() {
      _isHolding = false;
    });
    _slideStartTime = DateTime.now();
    final remaining = (slideDurationMs - _elapsedBeforePause).round().clamp(0, slideDurationMs);
    _startTimer(remaining);
  }

  void _nextSlide() {
    final currentGroup = widget.groups[_currentGroupIndex];
    if (_currentSlideIndex < currentGroup.slides.length - 1) {
      setState(() {
        _currentSlideIndex++;
      });
      _startStory();
    } else {
      _nextGroup();
    }
  }

  void _prevSlide() {
    if (_currentSlideIndex > 0) {
      setState(() {
        _currentSlideIndex--;
      });
      _startStory();
    } else {
      _prevGroup();
    }
  }

  void _nextGroup() {
    if (_currentGroupIndex < widget.groups.length - 1) {
      setState(() {
        _currentGroupIndex++;
        _currentSlideIndex = 0;
      });
      _startStory();
    } else {
      _closeViewer();
    }
  }

  void _prevGroup() {
    if (_currentGroupIndex > 0) {
      setState(() {
        _currentGroupIndex--;
        _currentSlideIndex = widget.groups[_currentGroupIndex].slides.length - 1;
      });
      _startStory();
    } else {
      _closeViewer();
    }
  }

  void _closeViewer() {
    _slideTimer?.cancel();
    Navigator.of(context).pop();
  }

  String _getCtaHref(Story s, String lang) {
    final ids = s.ctaIds ?? [];
    final type = s.ctaType ?? 'none';
    if (type == 'product' && ids.isNotEmpty) return '/products/${ids[0]}';
    if (type == 'category' && ids.isNotEmpty) return '/catalog?categoryId=${ids[0]}';
    if (type == 'brand' && ids.isNotEmpty) return '/catalog?brandId=${ids[0]}';
    return s.link;
  }

  @override
  void dispose() {
    _slideTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final group = widget.groups[_currentGroupIndex];
    final slide = group.slides[_currentSlideIndex];
    final ctaUrl = _getCtaHref(slide, lang);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Background Image or Video Slide
          Positioned.fill(
            child: slide.video != null && slide.video!.isNotEmpty
                ? StoryVideoPlayer(
                    url: slide.video!,
                    onFinished: _nextSlide,
                    isActive: true,
                  )
                : CachedNetworkImage(
                    imageUrl: slide.image,
                    fit: BoxFit.cover,
                  ),
          ),
          
          // Gesture Touch Areas
          Positioned.fill(
            child: GestureDetector(
              onLongPressStart: (_) => _pauseTimer(),
              onLongPressEnd: (_) => _resumeTimer(),
              onTapUp: (details) {
                final screenWidth = MediaQuery.of(context).size.width;
                final tapX = details.globalPosition.dx;
                if (tapX < screenWidth * 0.35) {
                  _prevSlide();
                } else {
                  _nextSlide();
                }
              },
            ),
          ),
          
          // Top Safe Overlay for progress & info
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.only(top: 48, bottom: 24, left: 16, right: 16),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.black54, Colors.transparent],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
              child: Column(
                children: [
                  // Progress Bars
                  Row(
                    children: List.generate(
                      group.slides.length,
                      (index) => Expanded(
                        child: Container(
                          height: 3,
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(1.5),
                          ),
                          alignment: Alignment.centerLeft,
                          child: FractionallySizedBox(
                            widthFactor: index < _currentSlideIndex
                                ? 1.0
                                : index == _currentSlideIndex
                                    ? _slideProgress
                                    : 0.0,
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(1.5),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  
                  // Group Header (Avatar + Title + Close)
                  Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white60, width: 1.5),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: CachedNetworkImage(
                          imageUrl: group.coverImage,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          group.getLocalizedTitle(lang),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: _closeViewer,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          // CTA Shopping Button at the bottom
          if (ctaUrl.isNotEmpty)
            Positioned(
              bottom: 48,
              left: 32,
              right: 32,
              child: Center(
                child: Container(
                  width: double.infinity,
                  height: 50,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(25),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppTheme.textPrimaryColor,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(25),
                      ),
                    ),
                    onPressed: () {
                      _closeViewer();
                      context.push(ctaUrl);
                    },
                    icon: const Icon(Icons.shopping_bag, color: AppTheme.primaryColor),
                    label: Text(
                      slide.getLocalizedCtaLabel(lang) ??
                          (lang == 'ru' ? 'Купить' : 'Xarid qilish'),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class StoryVideoPlayer extends StatefulWidget {
  final String url;
  final VoidCallback onFinished;
  final bool isActive;

  const StoryVideoPlayer({
    super.key,
    required this.url,
    required this.onFinished,
    required this.isActive,
  });

  @override
  State<StoryVideoPlayer> createState() => _StoryVideoPlayerState();
}

class _StoryVideoPlayerState extends State<StoryVideoPlayer> {
  late VideoPlayerController _controller;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url))
      ..initialize().then((_) {
        setState(() {
          _initialized = true;
        });
        if (widget.isActive) {
          _controller.play();
        }
      });
    _controller.addListener(_checkFinished);
  }

  void _checkFinished() {
    if (_initialized && _controller.value.position >= _controller.value.duration) {
      widget.onFinished();
    }
  }

  @override
  void didUpdateWidget(StoryVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive != oldWidget.isActive) {
      if (widget.isActive) {
        _controller.play();
      } else {
        _controller.pause();
      }
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_checkFinished);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
    }
    return SizedBox.expand(
      child: FittedBox(
        fit: BoxFit.contain,
        child: SizedBox(
          width: _controller.value.size.width,
          height: _controller.value.size.height,
          child: VideoPlayer(_controller),
        ),
      ),
    );
  }
}


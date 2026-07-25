import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../../core/models/banner.dart';
import '../../../../core/theme/app_theme.dart';
import 'package:go_router/go_router.dart';

class BannerSection extends StatefulWidget {
  final List<PromotionBanner> banners;
  final String language;
  final double? heightPx;
  final double? borderRadius;
  final int intervalMs;
  final bool bare;
  final String? aspectRatio;
  final String? outerPadding;

  const BannerSection({
    super.key,
    required this.banners,
    required this.language,
    this.heightPx = 200,
    this.borderRadius = 16,
    this.intervalMs = 3000,
    this.bare = false,
    this.aspectRatio,
    this.outerPadding,
  });

  @override
  State<BannerSection> createState() => _BannerSectionState();
}

class _BannerSectionState extends State<BannerSection> {
  int _currentIndex = 0;
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.banners.isEmpty) return const SizedBox.shrink();

    final children = widget.banners.map((b) {
      final html = b.getLocalizedHtml(widget.language) ?? '';
      return BannerWebViewItem(
        key: ValueKey(b.id),
        html: html,
        borderRadius: widget.borderRadius ?? 16,
      );
    }).toList();

    return Column(
      children: [
        SizedBox(
          height: widget.heightPx,
          child: PageView(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentIndex = index;
              });
            },
            children: children,
          ),
        ),
        if (widget.banners.length > 1) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              widget.banners.length,
              (index) => Container(
                width: 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _currentIndex == index
                      ? AppTheme.primaryColor
                      : Colors.grey.shade300,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class BannerWebViewItem extends StatefulWidget {
  final String html;
  final double borderRadius;

  const BannerWebViewItem({
    super.key,
    required this.html,
    required this.borderRadius,
  });

  @override
  State<BannerWebViewItem> createState() => _BannerWebViewItemState();
}

class _BannerWebViewItemState extends State<BannerWebViewItem> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (NavigationRequest request) {
            try {
              Uri uri = Uri.parse(request.url);
              // Handle deep link or internal routing
              String path = uri.path;
              if (path.isEmpty && uri.host.isNotEmpty) path = '/${uri.host}';
              if (path.isNotEmpty) {
                String fullPath = path;
                if (uri.query.isNotEmpty) {
                  fullPath += '?${uri.query}';
                }
                if (mounted) {
                  context.push(fullPath);
                }
              }
            } catch (e) {
              debugPrint('Banner click error: $e');
            }
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadHtmlString(_wrapHtml(widget.html));
  }

  String _wrapHtml(String content) {
    // Wrap Next.js styling / resets to ensure HTML looks correct inside the mobile webview
    return '''
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: transparent;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            * {
              max-width: 100%;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          $content
        </body>
      </html>
    ''';
  }

  @override
  void didUpdateWidget(covariant BannerWebViewItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.html != widget.html) {
      _controller.loadHtmlString(_wrapHtml(widget.html));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(widget.borderRadius),
        border: Border.all(color: Colors.grey.shade100),
      ),
      clipBehavior: Clip.antiAlias,
      child: WebViewWidget(controller: _controller),
    );
  }
}

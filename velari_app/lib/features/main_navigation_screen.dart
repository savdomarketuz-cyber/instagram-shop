import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../core/l10n/localization.dart';
import '../core/theme/app_theme.dart';

class MainNavigationScreen extends ConsumerStatefulWidget {
  final StatefulNavigationShell navigationShell;

  const MainNavigationScreen({super.key, required this.navigationShell});

  @override
  ConsumerState<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends ConsumerState<MainNavigationScreen> {
  late StreamSubscription<List<ConnectivityResult>> _connectivitySubscription;
  bool _isOffline = false;
  bool _showConnectedBanner = false;

  @override
  void initState() {
    super.initState();
    _checkInitialConnectivity();
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
      final offline = results.contains(ConnectivityResult.none) || results.isEmpty;
      _updateStatus(offline);
    });
  }

  Future<void> _checkInitialConnectivity() async {
    try {
      final results = await Connectivity().checkConnectivity();
      final offline = results.contains(ConnectivityResult.none) || results.isEmpty;
      if (offline != _isOffline) {
        setState(() {
          _isOffline = offline;
        });
      }
    } catch (_) {}
  }

  void _updateStatus(bool offline) {
    if (offline == _isOffline) return;

    setState(() {
      _isOffline = offline;
      if (!offline) {
        _showConnectedBanner = true;
      } else {
        _showConnectedBanner = false;
      }
    });

    if (_showConnectedBanner) {
      Timer(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() {
            _showConnectedBanner = false;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _connectivitySubscription.cancel();
    super.dispose();
  }

  void _onItemTapped(int index, BuildContext context) {
    widget.navigationShell.goBranch(
      index,
      initialLocation: index == widget.navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = widget.navigationShell.currentIndex;
    final lang = ref.watch(localeProvider);

    return Scaffold(
      body: Column(
        children: [
          if (_isOffline)
            SafeArea(
              bottom: false,
              child: Container(
                width: double.infinity,
                color: const Color(0xFFDC2626), // Premium red
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.wifi_off, color: Colors.white, size: 14),
                    const SizedBox(width: 8),
                    Text(
                      lang == 'ru' ? 'Нет подключения к интернету' : 'Internet aloqasi yoʻq',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          if (!_isOffline && _showConnectedBanner)
            SafeArea(
              bottom: false,
              child: Container(
                width: double.infinity,
                color: AppTheme.primaryColor, // Premium Velari green
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.wifi, color: Colors.white, size: 14),
                    const SizedBox(width: 8),
                    Text(
                      lang == 'ru' ? 'Интернет восстановлен' : 'Internet aloqasi tiklandi',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          Expanded(child: widget.navigationShell),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: selectedIndex,
          onTap: (index) => _onItemTapped(index, context),
          items: [
            BottomNavigationBarItem(
              icon: const Icon(Icons.storefront_outlined),
              activeIcon: const Icon(Icons.storefront, color: AppTheme.primaryColor),
              label: context.tr('nav_home', ref),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.shopping_cart_outlined),
              activeIcon: const Icon(Icons.shopping_cart, color: AppTheme.primaryColor),
              label: context.tr('nav_cart', ref),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.play_circle_outline),
              activeIcon: const Icon(Icons.play_circle, color: AppTheme.primaryColor),
              label: context.tr('nav_reels', ref),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.favorite_border),
              activeIcon: const Icon(Icons.favorite, color: AppTheme.primaryColor),
              label: context.tr('nav_wishlist', ref),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.person_outline),
              activeIcon: const Icon(Icons.person, color: AppTheme.primaryColor),
              label: context.tr('nav_profile', ref),
            ),
          ],
        ),
      ),
    );
  }
}

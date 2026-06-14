import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/main_navigation_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/cart/presentation/cart_screen.dart';
import '../../features/reels/presentation/reels_screen.dart';
import '../../features/wishlist/presentation/wishlist_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/product/presentation/product_screen.dart';
import '../../features/catalog/presentation/catalog_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/checkout/presentation/checkout_screen.dart';
import '../../features/payment/presentation/payment_screen.dart';
import '../../features/orders/presentation/order_success_screen.dart';
import '../../features/orders/presentation/orders_screen.dart';
import '../../features/wallet/presentation/wallet_screen.dart';
import '../../features/affiliate/presentation/affiliate_screen.dart';
import '../../features/chat/presentation/support_chat_screen.dart';
import '../../features/blog/presentation/blog_screen.dart';
import '../../features/blog/presentation/blog_detail_screen.dart';
import '../../features/store/presentation/store_screen.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();
final shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/',
    routes: [
      ShellRoute(
        navigatorKey: shellNavigatorKey,
        builder: (context, state, child) {
          return MainNavigationScreen(child: child);
        },
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/cart',
            builder: (context, state) => const CartScreen(),
          ),
          GoRoute(
            path: '/reels',
            builder: (context, state) => const ReelsScreen(),
          ),
          GoRoute(
            path: '/wishlist',
            builder: (context, state) => const WishlistScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/catalog',
            builder: (context, state) => const CatalogScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/products/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ProductScreen(id: id);
        },
      ),
      GoRoute(
        path: '/login',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/checkout',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const CheckoutScreen(),
      ),
      GoRoute(
        path: '/payment',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final orderId = state.uri.queryParameters['orderId'] ?? '';
          final total = state.uri.queryParameters['total'] ?? '';
          return PaymentScreen(orderId: orderId, total: total);
        },
      ),
      GoRoute(
        path: '/order-success',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final orderId = state.uri.queryParameters['orderId'] ?? '';
          return OrderSuccessScreen(orderId: orderId);
        },
      ),
      GoRoute(
        path: '/orders',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const OrdersScreen(),
      ),
      GoRoute(
        path: '/wallet',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const WalletScreen(),
      ),
      GoRoute(
        path: '/affiliate',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const AffiliateScreen(),
      ),
      GoRoute(
        path: '/chat',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const SupportChatScreen(),
      ),
      GoRoute(
        path: '/blog',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const BlogScreen(),
      ),
      GoRoute(
        path: '/blog/:slug',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final slug = state.pathParameters['slug']!;
          return BlogDetailScreen(slug: slug);
        },
      ),
      GoRoute(
        path: '/store/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return StoreScreen(warehouseId: id);
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Sahifa topilmadi: ${state.error}'),
      ),
    ),
  );
});

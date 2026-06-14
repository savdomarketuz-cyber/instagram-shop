import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';

class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('nav_wishlist', ref)),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.favorite_border, size: 80, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              context.tr('wishlist_empty', ref),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppTheme.textSecondaryColor,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

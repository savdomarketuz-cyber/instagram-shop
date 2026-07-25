import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive_ce.dart';
import '../models/product.dart';

// --- WISHLIST MANAGEMENT ---
class WishlistNotifier extends StateNotifier<List<String>> {
  final Box _wishlistBox;

  WishlistNotifier(this._wishlistBox) : super([]) {
    _loadWishlist();
  }

  void _loadWishlist() {
    final List<dynamic> savedIds = _wishlistBox.get('ids', defaultValue: <dynamic>[]);
    state = savedIds.map((e) => e.toString()).toList();
  }

  Future<void> toggleWishlist(String productId) async {
    final updated = List<String>.from(state);
    if (updated.contains(productId)) {
      updated.remove(productId);
    } else {
      updated.add(productId);
    }
    state = updated;
    await _wishlistBox.put('ids', updated);
  }

  bool isFavorite(String productId) {
    return state.contains(productId);
  }
}

final wishlistBoxProvider = Provider<Box>((ref) => Hive.box('wishlist'));

final wishlistProvider = StateNotifierProvider<WishlistNotifier, List<String>>((ref) {
  final box = ref.watch(wishlistBoxProvider);
  return WishlistNotifier(box);
});

// --- CART MANAGEMENT ---
class CartItem {
  final Product product;
  final int quantity;
  final String? selectedColor;
  final String? selectedSize;

  CartItem({
    required this.product,
    required this.quantity,
    this.selectedColor,
    this.selectedSize,
  });

  CartItem copyWith({
    Product? product,
    int? quantity,
    String? selectedColor,
    String? selectedSize,
  }) {
    return CartItem(
      product: product ?? this.product,
      quantity: quantity ?? this.quantity,
      selectedColor: selectedColor ?? this.selectedColor,
      selectedSize: selectedSize ?? this.selectedSize,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'product': product.toJson(),
      'quantity': quantity,
      'selectedColor': selectedColor,
      'selectedSize': selectedSize,
    };
  }

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      product: Product.fromJson(Map<String, dynamic>.from(json['product'] as Map)),
      quantity: json['quantity'] as int,
      selectedColor: json['selectedColor'] as String?,
      selectedSize: json['selectedSize'] as String?,
    );
  }
}

class CartNotifier extends StateNotifier<List<CartItem>> {
  final Box _cartBox;

  CartNotifier(this._cartBox) : super([]) {
    _loadCart();
  }

  void _loadCart() {
    final List<dynamic>? savedItems = _cartBox.get('items');
    if (savedItems != null) {
      state = savedItems.map((e) {
        final Map<String, dynamic> json = Map<String, dynamic>.from(e as Map);
        return CartItem.fromJson(json);
      }).toList();
    }
  }

  Future<void> _saveCart() async {
    final jsonList = state.map((item) => item.toJson()).toList();
    await _cartBox.put('items', jsonList);
  }

  Future<void> addToCart(Product product, {int qty = 1, String? color, String? size}) async {
    final index = state.indexWhere((item) =>
        item.product.id == product.id &&
        item.selectedColor == color &&
        item.selectedSize == size);

    if (index != -1) {
      final existingItem = state[index];
      state = [
        ...state.sublist(0, index),
        existingItem.copyWith(quantity: existingItem.quantity + qty),
        ...state.sublist(index + 1),
      ];
    } else {
      state = [...state, CartItem(product: product, quantity: qty, selectedColor: color, selectedSize: size)];
    }
    await _saveCart();
  }

  Future<void> updateQuantity(String productId, int delta, {String? color, String? size}) async {
    final index = state.indexWhere((item) =>
        item.product.id == productId &&
        item.selectedColor == color &&
        item.selectedSize == size);

    if (index == -1) return;

    final item = state[index];
    final newQty = item.quantity + delta;

    if (newQty <= 0) {
      state = [
        ...state.sublist(0, index),
        ...state.sublist(index + 1),
      ];
    } else {
      state = [
        ...state.sublist(0, index),
        item.copyWith(quantity: newQty),
        ...state.sublist(index + 1),
      ];
    }
    await _saveCart();
  }

  Future<void> removeFromCart(String productId, {String? color, String? size}) async {
    state = state.where((item) =>
        !(item.product.id == productId &&
          item.selectedColor == color &&
          item.selectedSize == size)).toList();
    await _saveCart();
  }

  Future<void> clearCart() async {
    state = [];
    await _saveCart();
  }

  double get totalCartAmount {
    return state.fold(0, (sum, item) => sum + (item.product.price * item.quantity));
  }
}

final cartBoxProvider = Provider<Box>((ref) => Hive.box('cart'));

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  final box = ref.watch(cartBoxProvider);
  return CartNotifier(box);
});

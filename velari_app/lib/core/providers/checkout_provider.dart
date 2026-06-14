import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../supabase/supabase_client.dart';
import '../l10n/localization.dart';
import 'cart_wishlist_providers.dart';

class CheckoutState {
  final String? promoCode;
  final double promoDiscount;
  final String selectedDeliveryType; // 'standard' or 'express'
  final String addressText;
  final List<double>? coords; // [lat, lng]
  final bool isUseWallet;
  final double walletBalance;
  final double expressDeliveryCost;
  final bool expressEligible;
  final String expressEta;
  final bool isSubmitting;
  final Map<String, double> personalOffers; // productId -> discountPercent

  CheckoutState({
    this.promoCode,
    this.promoDiscount = 0.0,
    this.selectedDeliveryType = 'standard',
    this.addressText = '',
    this.coords,
    this.isUseWallet = false,
    this.walletBalance = 0.0,
    this.expressDeliveryCost = 0.0,
    this.expressEligible = false,
    this.expressEta = '',
    this.isSubmitting = false,
    this.personalOffers = const {},
  });

  CheckoutState copyWith({
    String? promoCode,
    double? promoDiscount,
    String? selectedDeliveryType,
    String? addressText,
    List<double>? coords,
    bool? isUseWallet,
    double? walletBalance,
    double? expressDeliveryCost,
    bool? expressEligible,
    String? expressEta,
    bool? isSubmitting,
    Map<String, double>? personalOffers,
  }) {
    return CheckoutState(
      promoCode: promoCode ?? this.promoCode,
      promoDiscount: promoDiscount ?? this.promoDiscount,
      selectedDeliveryType: selectedDeliveryType ?? this.selectedDeliveryType,
      addressText: addressText ?? this.addressText,
      coords: coords ?? this.coords,
      isUseWallet: isUseWallet ?? this.isUseWallet,
      walletBalance: walletBalance ?? this.walletBalance,
      expressDeliveryCost: expressDeliveryCost ?? this.expressDeliveryCost,
      expressEligible: expressEligible ?? this.expressEligible,
      expressEta: expressEta ?? this.expressEta,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      personalOffers: personalOffers ?? this.personalOffers,
    );
  }
}

class CheckoutNotifier extends StateNotifier<CheckoutState> {
  final ApiClient _apiClient;
  final Ref _ref;

  CheckoutNotifier(this._apiClient, this._ref) : super(CheckoutState());

  // 1. Fetch Personal Offers
  Future<void> fetchPersonalOffers() async {
    try {
      final response = await _apiClient.dio.get('/api/discount');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (data['success'] == true && data['offers'] is List) {
          final Map<String, double> offersMap = {};
          for (final o in data['offers']) {
            final pid = o['product_id']?.toString() ?? '';
            final pct = (o['percent'] as num?)?.toDouble() ?? 0.0;
            if (pid.isNotEmpty && pct > (offersMap[pid] ?? 0.0)) {
              offersMap[pid] = pct;
            }
          }
          state = state.copyWith(personalOffers: offersMap);
        }
      }
    } catch (_) {
      // Ignore guest or offline errors
    }
  }

  // 2. Fetch Wallet Balance directly from Supabase user_wallets table
  Future<void> fetchWalletBalance(String? userPhone) async {
    if (userPhone == null || userPhone.isEmpty) return;
    try {
      final supabase = _ref.read(supabaseClientProvider);
      final cleanPhone = userPhone.replaceAll(RegExp(r'\D'), '');
      
      final response = await supabase
          .from('user_wallets')
          .select('balance')
          .eq('user_phone', cleanPhone)
          .maybeSingle();

      if (response != null && response['balance'] != null) {
        final balance = (response['balance'] as num).toDouble();
        state = state.copyWith(walletBalance: balance);
      }
    } catch (e) {
      debugPrint('Error fetching wallet balance: $e');
    }
  }

  // 3. Apply Promo Code
  Future<bool> applyPromo(String code, double totalAmount, String? userPhone) async {
    if (code.trim().isEmpty) return false;
    try {
      final response = await _apiClient.dio.post('/api/promo-codes/validate', data: {
        'code': code.toUpperCase(),
        'totalAmount': totalAmount,
        'userPhone': userPhone,
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (data['success'] == true) {
          final promoCode = data['code']?.toString() ?? code.toUpperCase();
          final discount = (data['discount'] as num?)?.toDouble() ?? 0.0;
          state = state.copyWith(
            promoCode: promoCode,
            promoDiscount: discount,
          );
          ApiClient.showToast("Promo kod qo'llanildi!", isError: false);
          return true;
        } else {
          ApiClient.showToast(data['error']?.toString() ?? "Promo kod noto'g'ri", isError: true);
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  // 4. Remove Promo Code
  void removePromo() {
    state = state.copyWith(promoCode: null, promoDiscount: 0.0);
  }

  // 5. Update Address details
  void updateAddress(String address, {List<double>? coords}) {
    state = state.copyWith(addressText: address, coords: coords);
    if (coords != null) {
      _reevaluateExpress();
    }
  }

  // 6. Update Delivery Type selection
  void setDeliveryType(String type) {
    if (type == 'express' || type == 'standard') {
      state = state.copyWith(selectedDeliveryType: type);
    }
  }

  // 7. Toggle Wallet Usage
  void setUseWallet(bool use) {
    state = state.copyWith(isUseWallet: use);
  }

  // 8. Re-evaluate Express Delivery pricing & eligibility
  Future<void> _reevaluateExpress() async {
    final coords = state.coords;
    if (coords == null || coords.length != 2) return;

    final cartItems = _ref.read(cartProvider);
    if (cartItems.isEmpty) return;

    final itemsPayload = cartItems.map((item) => {'id': item.product.id}).toList();
    final goodsTotal = cartItems.fold<double>(0, (sum, item) => sum + (item.product.price * item.quantity));

    try {
      final response = await _apiClient.dio.post('/api/delivery/express', data: {
        'items': itemsPayload,
        'coords': coords,
        'orderAmount': goodsTotal,
        'language': _ref.read(localeProvider),
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (data['success'] == true) {
          final eligible = data['eligible'] as bool? ?? false;
          final price = (data['price'] as num?)?.toDouble() ?? 0.0;
          final eta = data['etaText']?.toString() ?? '';

          state = state.copyWith(
            expressEligible: eligible,
            expressDeliveryCost: price,
            expressEta: eta,
          );
        }
      }
    } catch (_) {}
  }

  // 9. Place Order on server
  Future<String?> placeOrder({
    required String userPhone,
    required List<CartItem> items,
  }) async {
    if (state.addressText.trim().isEmpty) {
      ApiClient.showToast("Yetkazish manzili kiritilishi shart", isError: true);
      return null;
    }

    state = state.copyWith(isSubmitting: true);

    final itemsPayload = items.map((item) {
      return {
        'id': item.product.id,
        'name': _ref.read(localeProvider) == 'ru' ? item.product.nameRu : item.product.nameUz,
        'price': item.product.price,
        'quantity': item.quantity,
        'image': item.product.image,
      };
    }).toList();

    final subtotal = items.fold<double>(0.0, (sum, item) => sum + (item.product.price * item.quantity));
    
    // Calculate smart/personal discount
    double smartDiscount = 0.0;
    for (final item in items) {
      final pct = state.personalOffers[item.product.id] ?? 0.0;
      if (pct > 0) {
        smartDiscount += (item.product.price * item.quantity * pct / 100).floorToDouble();
      }
    }

    // Determine wallet usage amount
    double walletUsageAmount = 0.0;
    if (state.isUseWallet) {
      final maxAvailableToPay = subtotal - smartDiscount - state.promoDiscount;
      walletUsageAmount = state.walletBalance > maxAvailableToPay ? maxAvailableToPay : state.walletBalance;
    }

    try {
      final response = await _apiClient.dio.post('/api/orders/place', data: {
        'p_user_phone': userPhone,
        'p_items': itemsPayload,
        'p_address': state.addressText,
        'p_coords': state.coords,
        'p_promo_code': state.promoCode,
        'p_wallet_usage': walletUsageAmount > 0 ? walletUsageAmount : null,
        'p_delivery_type': state.selectedDeliveryType,
        'p_referral_data': {}, // Send empty object for referral map
        'p_status': "To'lov kutilmoqda",
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (data['success'] == true && data['orderId'] != null) {
          final orderId = data['orderId'].toString();
          
          // Clear cart on success
          await _ref.read(cartProvider.notifier).clearCart();
          
          // Reset checkout state
          state = CheckoutState();
          
          return orderId;
        } else {
          ApiClient.showToast(data['message']?.toString() ?? "Buyurtma yaratib bo'lmadi", isError: true);
        }
      }
    } catch (_) {
      // Handled by interceptor
    } finally {
      state = state.copyWith(isSubmitting: false);
    }
    return null;
  }
}

final checkoutProvider = StateNotifierProvider<CheckoutNotifier, CheckoutState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return CheckoutNotifier(apiClient, ref);
});

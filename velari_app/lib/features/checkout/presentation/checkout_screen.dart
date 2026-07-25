import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/cart_wishlist_providers.dart';
import '../../../core/providers/checkout_provider.dart';
import '../../../core/api/api_client.dart';
import '../../auth/providers/auth_provider.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Load personal offers and wallet balance
    Future.microtask(() {
      final user = ref.read(authProvider);
      if (user != null) {
        ref.read(checkoutProvider.notifier).fetchPersonalOffers();
        ref.read(checkoutProvider.notifier).fetchWalletBalance(user.phone);
        _phoneController.text = user.phone;
      }
    });
  }

  @override
  void dispose() {
    _addressController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _showMapSimulationModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final lang = ref.watch(localeProvider);
          // Simulated coords in Tashkent
          final List<Map<String, dynamic>> regions = [
            {'name': 'Yunusobod tumani', 'lat': 41.3612, 'lng': 69.2891},
            {'name': 'Mirzo Ulugʻbek tumani', 'lat': 41.3262, 'lng': 69.3283},
            {'name': 'Chilonzor tumani', 'lat': 41.2829, 'lng': 69.2062},
            {'name': 'Yashnobod tumani', 'lat': 41.2982, 'lng': 69.3364},
            {'name': 'Mirobod tumani', 'lat': 41.2965, 'lng': 69.2789},
          ];

          return Container(
            height: 500,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
                const SizedBox(height: 16),
                Text(
                  lang == 'ru' ? 'Выбрать положение на карте' : 'Kartadan joylashuvni tanlash',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
                ),
                const SizedBox(height: 8),
                Text(
                  lang == 'ru' ? 'Выберите один из районов Ташкента для симуляции:' : 'Simulatsiya uchun Toshkent tumanlaridan birini tanlang:',
                  style: const TextStyle(fontSize: 12, color: AppTheme.textSecondaryColor),
                ),
                const SizedBox(height: 16),
                // Premium Styled Map Simulation Box
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFE5E7EB),
                      borderRadius: BorderRadius.circular(24),
                      image: const DecorationImage(
                        image: NetworkImage('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=400'),
                        fit: BoxFit.cover,
                        opacity: 0.15,
                      ),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Stack(
                      children: [
                        const Center(
                          child: Icon(
                            Icons.location_on,
                            size: 48,
                            color: Colors.red,
                          ),
                        ),
                        ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: regions.length,
                          itemBuilder: (context, idx) {
                            final reg = regions[idx];
                            return Card(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 2,
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: const Icon(Icons.map, color: AppTheme.primaryColor),
                                title: Text(
                                  reg['name'] as String,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                subtitle: Text('Lat: ${reg['lat']}, Lng: ${reg['lng']}', style: const TextStyle(fontSize: 11)),
                                trailing: const Icon(Icons.check_circle_outline, color: AppTheme.primaryColor),
                                onTap: () {
                                  ref.read(checkoutProvider.notifier).updateAddress(
                                        'Toshkent sh., ${reg['name']}',
                                        coords: [reg['lat'] as double, reg['lng'] as double],
                                      );
                                  _addressController.text = 'Toshkent sh., ${reg['name']}';
                                  Navigator.pop(context);
                                },
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
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

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider);
    final checkoutState = ref.watch(checkoutProvider);
    final cartItems = ref.watch(cartProvider);
    final lang = ref.watch(localeProvider);

    // If not logged in, show login prompt card
    if (user == null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(context.tr('common.checkout', ref)),
          centerTitle: true,
          elevation: 0,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 70,
                      height: 70,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFFF0EE),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.lock_outline, color: Color(0xFFEF4444), size: 36),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      lang == 'ru' ? 'Вход в аккаунт' : 'Tizimga kirish',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      lang == 'ru'
                          ? 'Для оформления заказа необходимо войти в систему.'
                          : 'Buyurtmani rasmiylashtirish uchun avval tizimga kiring.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 13),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () {
                          context.push('/login?redirect=/checkout');
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                        ),
                        child: Text(
                          lang == 'ru' ? 'Войти' : 'Tizimga kirish',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    if (cartItems.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text(context.tr('common.checkout', ref)),
          centerTitle: true,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.shopping_cart_outlined, size: 64, color: Colors.grey.shade400),
              const SizedBox(height: 12),
              Text(
                lang == 'ru' ? 'Корзина пуста' : 'Savat boʻsh',
                style: const TextStyle(color: AppTheme.textSecondaryColor),
              ),
            ],
          ),
        ),
      );
    }

    // Sum calculation
    final subtotal = cartItems.fold<double>(0.0, (sum, item) => sum + (item.product.price * item.quantity));

    double smartDiscount = 0.0;
    for (final item in cartItems) {
      final pct = checkoutState.personalOffers[item.product.id] ?? 0.0;
      if (pct > 0) {
        smartDiscount += (item.product.price * item.quantity * pct / 100).floorToDouble();
      }
    }

    final promoDiscount = checkoutState.promoDiscount;
    final goodsTotal = (subtotal - smartDiscount - promoDiscount).clamp(0.0, double.infinity);

    // Delivery price
    double deliveryFee = 0.0;
    if (checkoutState.selectedDeliveryType == 'express') {
      deliveryFee = checkoutState.expressDeliveryCost;
    } else {
      final deliveryBasis = (subtotal - smartDiscount).clamp(0.0, double.infinity);
      deliveryFee = deliveryBasis >= 150000 ? 0.0 : 25000.0;
    }

    // Wallet/Cashback deduction
    double walletDeduction = 0.0;
    if (checkoutState.isUseWallet) {
      final totalBeforeWallet = goodsTotal + deliveryFee;
      walletDeduction = checkoutState.walletBalance >= totalBeforeWallet
          ? totalBeforeWallet
          : checkoutState.walletBalance;
    }

    final total = (goodsTotal + deliveryFee - walletDeduction).clamp(0.0, double.infinity);

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        title: Text(context.tr('common.checkout', ref)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppTheme.textPrimaryColor,
      ),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 160),
            children: [
              // Contact details
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                elevation: 0,
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lang == 'ru' ? 'Контактная информация' : 'Aloqa maʼlumotlari',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimaryColor),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _phoneController,
                        enabled: false,
                        decoration: InputDecoration(
                          labelText: context.tr('common.phone', ref),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Address & Maps Picker Card
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                elevation: 0,
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lang == 'ru' ? 'Адрес доставки' : 'Etkazib berish manzili',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimaryColor),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _addressController,
                        onChanged: (val) {
                          ref.read(checkoutProvider.notifier).updateAddress(val);
                        },
                        decoration: InputDecoration(
                          labelText: context.tr('common.address', ref),
                          hintText: lang == 'ru' ? 'г. Ташкент, ул. Навои...' : 'Toshkent sh., Navoiy koʻchasi...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () => _showMapSimulationModal(context),
                        icon: const Icon(Icons.map_outlined),
                        label: Text(context.tr('common.selectOnMap', ref)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.primaryColor,
                          side: const BorderSide(color: AppTheme.primaryColor),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          minimumSize: const Size(double.infinity, 44),
                        ),
                      ),
                      if (checkoutState.coords != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Koordinata: ${checkoutState.coords![0].toStringAsFixed(4)}, ${checkoutState.coords![1].toStringAsFixed(4)}',
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Delivery Type Selection Card
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                elevation: 0,
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lang == 'ru' ? 'Способ доставки' : 'Yetkazib berish turi',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimaryColor),
                      ),
                      const SizedBox(height: 12),
                      RadioListTile<String>(
                        title: Text(lang == 'ru' ? 'Стандартная доставка' : 'Standart yetkazish'),
                        subtitle: Text(lang == 'ru' ? 'В течение дня (150 000 сум + БЕСПЛАТНО)' : 'Kun davomida (150 000 so\'m + BEPUL)'),
                        value: 'standard',
                        groupValue: checkoutState.selectedDeliveryType,
                        activeColor: AppTheme.primaryColor,
                        onChanged: (val) {
                          if (val != null) ref.read(checkoutProvider.notifier).setDeliveryType(val);
                        },
                      ),
                      if (checkoutState.expressEligible)
                        RadioListTile<String>(
                          title: Row(
                            children: [
                              Text(lang == 'ru' ? 'Быстрая экспресс доставка' : 'Tezkor express yetkazish'),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF7ED),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: Colors.orange.shade300),
                                ),
                                child: Text(
                                  lang == 'ru' ? '30-90 мин' : '30-90 daq',
                                  style: const TextStyle(color: Colors.orange, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          subtitle: Text(
                            checkoutState.expressEta.isNotEmpty
                                ? '${lang == 'ru' ? "Время: " : "Vaqt: "} ${checkoutState.expressEta}'
                                : (lang == 'ru' ? 'Рассчитывается по расстоянию' : 'Masofaga qarab hisoblanadi'),
                          ),
                          value: 'express',
                          groupValue: checkoutState.selectedDeliveryType,
                          activeColor: AppTheme.primaryColor,
                          onChanged: (val) {
                            if (val != null) ref.read(checkoutProvider.notifier).setDeliveryType(val);
                          },
                        )
                      else if (checkoutState.coords != null)
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Text(
                            lang == 'ru'
                                ? '⚠️ Экспресс-доставка недоступна для выбранных товаров'
                                : '⚠️ Tanlangan mahsulotlar uchun tezkor yetkazish mavjud emas',
                            style: const TextStyle(color: Colors.orange, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Wallet balance row
              if (checkoutState.walletBalance > 0) ...[
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                  elevation: 0,
                  color: Colors.white,
                  child: CheckboxListTile(
                    title: Text(context.tr('common.payFromWallet', ref)),
                    subtitle: Text(
                      context.tr(
                        'common.availableBalance',
                        ref,
                        args: {'balance': _formatPrice(checkoutState.walletBalance, lang).replaceFirst(' so\'m', '').replaceFirst(' сум', '')},
                      ),
                    ),
                    value: checkoutState.isUseWallet,
                    activeColor: AppTheme.primaryColor,
                    onChanged: (val) {
                      if (val != null) ref.read(checkoutProvider.notifier).setUseWallet(val);
                    },
                  ),
                ),
                const SizedBox(height: 12),
              ],
              // Order items summary
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                elevation: 0,
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lang == 'ru' ? 'Детали заказа' : 'Buyurtma tafsilotlari',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimaryColor),
                      ),
                      const SizedBox(height: 12),
                      ...cartItems.map((item) {
                        final name = (lang == 'ru' ? item.product.nameRu : item.product.nameUz) ?? item.product.name;
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  '${item.quantity} × $name',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 13),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                _formatPrice(item.product.price * item.quantity, lang),
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
            ],
          ),
          // Checkout total and action sticky bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.9),
                border: const Border(top: BorderSide(color: Color(0x1F0F1410), width: 0.5)),
              ),
              child: SafeArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Price calculations breakdown
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(lang == 'ru' ? 'Стоимость доставки' : 'Yetkazish toʻlovi', style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 13)),
                        Text(
                          deliveryFee > 0 ? _formatPrice(deliveryFee, lang) : context.tr('cart.free', ref),
                          style: TextStyle(color: deliveryFee > 0 ? AppTheme.textPrimaryColor : AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ],
                    ),
                    if (walletDeduction > 0) ...[
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(lang == 'ru' ? 'Оплачено из кошелька' : 'Hamyondan toʻlandi', style: const TextStyle(color: AppTheme.primaryColor, fontSize: 13)),
                          Text('-${_formatPrice(walletDeduction, lang)}', style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: 13)),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton(
                        onPressed: checkoutState.isSubmitting
                            ? null
                            : () async {
                                if (_addressController.text.trim().isEmpty) {
                                  ApiClient.showToast(lang == 'ru' ? "Укажите адрес доставки" : "Yetkazish manzili ko'rsatilmadi", isError: true);
                                  return;
                                }

                                final orderId = await ref.read(checkoutProvider.notifier).placeOrder(
                                      userPhone: user.phone,
                                      items: cartItems,
                                    );

                                if (orderId != null && mounted) {
                                  context.push('/payment?orderId=$orderId&total=$total');
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(27)),
                          shadowColor: AppTheme.primaryColor.withOpacity(0.3),
                          elevation: 8,
                        ),
                        child: checkoutState.isSubmitting
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    '${context.tr('common.checkout', ref)} · ${_formatPrice(total, lang)}',
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: -0.2),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.arrow_forward, size: 18),
                                ],
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

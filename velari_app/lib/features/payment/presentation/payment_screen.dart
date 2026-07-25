import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../auth/providers/auth_provider.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  final String orderId;
  final String total;

  const PaymentScreen({
    super.key,
    required this.orderId,
    required this.total,
  });

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  String _paymentMethod = 'click'; // 'click' or 'cash'
  bool _isProcessing = false;
  Map<String, dynamic>? _order;
  bool _isLoadingOrder = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchOrderDetails();
  }

  Future<void> _fetchOrderDetails() async {
    final user = ref.read(authProvider);
    if (user == null) {
      setState(() {
        _isLoadingOrder = false;
        _error = "Avval tizimga kiring";
      });
      return;
    }

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.dio.get(
        '/api/orders/get',
        queryParameters: {
          'orderId': widget.orderId,
          'phone': user.phone,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (data['success'] == true) {
          setState(() {
            _order = data['order'] as Map<String, dynamic>;
            _isLoadingOrder = false;
          });
          return;
        }
      }
      setState(() {
        _error = "Buyurtma ma'lumotlarini yuklab bo'lmadi";
        _isLoadingOrder = false;
      });
    } catch (e) {
      setState(() {
        _error = "Xatolik yuz berdi: $e";
        _isLoadingOrder = false;
      });
    }
  }

  Future<void> _handlePayment() async {
    final user = ref.read(authProvider);
    if (user == null || _order == null) return;

    setState(() {
      _isProcessing = true;
      _error = null;
    });

    final lang = ref.read(localeProvider);
    final finalStatus = _paymentMethod == 'cash'
        ? (lang == 'uz' ? "Qabul qilindi" : "Принят")
        : (lang == 'uz' ? "To'lov kutilmoqda" : "Ожидание оплаты");

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.dio.post(
        '/api/orders/update-status',
        data: {
          'orderId': widget.orderId,
          'status': finalStatus,
          'paymentMethod': _paymentMethod,
          'userPhone': user.phone,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (data['success'] == true) {
          if (_paymentMethod == 'click') {
            // Launch Click portal
            // Standard sandbox/production config for Velari
            const serviceId = "33486"; // Default fallback Click Service ID
            const merchantId = "24718"; // Default fallback Click Merchant ID
            
            final baseUrl = apiClient.dio.options.baseUrl;
            final returnUrl = Uri.encodeComponent('$baseUrl/order-success');
            final params = 'service_id=$serviceId&merchant_id=$merchantId&amount=${widget.total}&transaction_param=${widget.orderId}&return_url=$returnUrl';
            
            final webUrl = Uri.parse('https://my.click.uz/services/pay?$params');
            final appUrl = Uri.parse('clickuz://payment?$params');

            if (await canLaunchUrl(appUrl)) {
              await launchUrl(appUrl);
            } else {
              await launchUrl(webUrl, mode: LaunchMode.externalApplication);
            }

            // Move to Success screen
            if (mounted) {
              context.go('/order-success?orderId=${widget.orderId}');
            }
          } else {
            // Cash on delivery notification
            try {
              await apiClient.dio.post('/api/notify', data: {
                'orderId': widget.orderId,
                'method': 'cash',
              });
            } catch (_) {}

            if (mounted) {
              context.go('/order-success?orderId=${widget.orderId}');
            }
          }
          return;
        }
      }
      setState(() {
        _error = "To'lov holatini yangilab bo'lmadi";
        _isProcessing = false;
      });
    } catch (e) {
      setState(() {
        _error = "Xatolik yuz berdi: $e";
        _isProcessing = false;
      });
    }
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
    final lang = ref.watch(localeProvider);

    if (_isLoadingOrder) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryColor),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        title: Text(lang == 'ru' ? 'Способ оплаты' : "To'lov usuli"),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppTheme.textPrimaryColor,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: Column(
          children: [
            // Click option
            GestureDetector(
              onTap: () => setState(() => _paymentMethod = 'click'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: _paymentMethod == 'click' ? const Color(0xFFE5F6FF) : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: _paymentMethod == 'click' ? const Color(0xFF00A1FF) : Colors.grey.shade100,
                    width: 2,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _paymentMethod == 'click' ? const Color(0xFF00A1FF) : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        Icons.payment,
                        color: _paymentMethod == 'click' ? Colors.white : Colors.grey.shade600,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            lang == 'ru' ? 'Оплата через Click' : "Click orqali to'lash",
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: _paymentMethod == 'click' ? const Color(0xFF00A1FF) : AppTheme.textPrimaryColor,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            lang == 'ru' ? 'Переход на портал Click' : 'Avtomatlashtirilgan Click portaliga oʻtish',
                            style: TextStyle(color: Colors.grey.shade400, fontSize: 10, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    Radio<String>(
                      value: 'click',
                      groupValue: _paymentMethod,
                      activeColor: const Color(0xFF00A1FF),
                      onChanged: (val) {
                        if (val != null) setState(() => _paymentMethod = val);
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Cash option
            GestureDetector(
              onTap: () => setState(() => _paymentMethod = 'cash'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: _paymentMethod == 'cash' ? Colors.white : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: _paymentMethod == 'cash' ? AppTheme.primaryColor : Colors.grey.shade100,
                    width: 2,
                  ),
                  boxShadow: _paymentMethod == 'cash'
                      ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15)]
                      : null,
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _paymentMethod == 'cash' ? AppTheme.primaryColor : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        Icons.money_outlined,
                        color: _paymentMethod == 'cash' ? Colors.white : Colors.grey.shade600,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            lang == 'ru' ? 'При получении' : 'Naqd pul yoki karta (Olganda)',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimaryColor,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            lang == 'ru' ? 'Оплата при получении товара' : "Mahsulotni qo'lingizga olganda to'lang",
                            style: TextStyle(color: Colors.grey.shade400, fontSize: 10, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    Radio<String>(
                      value: 'cash',
                      groupValue: _paymentMethod,
                      activeColor: AppTheme.primaryColor,
                      onChanged: (val) {
                        if (val != null) setState(() => _paymentMethod = val);
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF0EE),
                  border: Border.all(color: const Color(0xFFD02E2E).withOpacity(0.2)),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Color(0xFFEF4444)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Color(0xFFEF4444), fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            // Order summary card
            if (_order != null)
              Container(
                padding: const EdgeInsets.all(22),
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primaryColor, Color(0xFF1F5A30)],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryColor.withOpacity(0.28),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          lang == 'ru' ? 'Товары' : 'Tovarlar',
                          style: const TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        Text(
                          _formatPrice(((_order!['total'] as num).toDouble() - ((_order!['delivery_fee'] as num?)?.toDouble() ?? 0.0)), lang),
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.local_shipping_outlined, color: Colors.white70, size: 14),
                            const SizedBox(width: 6),
                            Text(
                              _order!['delivery_type'] == 'express'
                                  ? (lang == 'ru' ? 'Экспресс-доставка' : 'Tezkor yetkazish')
                                  : (lang == 'ru' ? 'Стандартная доставка' : 'Standart yetkazish'),
                              style: const TextStyle(color: Colors.white70, fontSize: 13),
                            ),
                          ],
                        ),
                        Text(
                          (_order!['delivery_fee'] as num? ?? 0) > 0
                              ? _formatPrice((_order!['delivery_fee'] as num).toDouble(), lang)
                              : (lang == 'ru' ? 'Бесплатно' : 'Bepul'),
                          style: TextStyle(
                            color: (_order!['delivery_fee'] as num? ?? 0) > 0 ? Colors.white : const Color(0xFFA3F0B8),
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(height: 1, color: Colors.white24),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          lang == 'ru' ? 'Итого' : 'Jami',
                          style: const TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          _formatPrice((_order!['total'] as num).toDouble(), lang),
                          style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            // Action button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _isProcessing ? null : _handlePayment,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _paymentMethod == 'click' ? const Color(0xFF00A1FF) : AppTheme.primaryColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  shadowColor: _paymentMethod == 'click' ? const Color(0xFF00A1FF).withOpacity(0.3) : AppTheme.primaryColor.withOpacity(0.3),
                  elevation: 8,
                ),
                child: _isProcessing
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _paymentMethod == 'click'
                                ? (lang == 'ru' ? 'Перейти в Click' : "Click'ga o'tish")
                                : (lang == 'ru' ? 'Оформить заказ' : 'Buyurtmani rasmiylashtirish'),
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 1.0),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.check_circle_outline, size: 20),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

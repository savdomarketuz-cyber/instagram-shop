import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/models/order.dart';
import '../../../core/api/api_client.dart';
import '../../auth/providers/auth_provider.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  bool _isLoading = true;
  List<Order> _orders = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    final user = ref.read(authProvider);
    if (user == null) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final supabase = ref.read(supabaseClientProvider);
      final response = await supabase
          .from('orders')
          .select('*')
          .eq('user_phone', user.phone)
          .order('created_at', ascending: false);

      final orderList = (response as List).map((x) => Order.fromJson(x as Map<String, dynamic>)).toList();
      setState(() {
        _orders = orderList;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = "Buyurtmalarni yuklab bo'lmadi";
        _isLoading = false;
      });
    }
  }

  Future<void> _cancelOrder(Order order) async {
    final user = ref.read(authProvider);
    if (user == null) return;

    final lang = ref.read(localeProvider);
    final statusCancelled = lang == 'ru' ? "Отменен" : "Bekor qilingan";

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text(lang == 'ru' ? "Отмена заказа" : "Buyurtmani bekor qilish"),
        content: Text(lang == 'ru'
            ? "Вы действительно хотите отменить этот заказ?"
            : "Haqiqatan ham ushbu buyurtmani bekor qilmoqchimisiz?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(lang == 'ru' ? "Назад" : "Orqaga"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            child: Text(lang == 'ru' ? "Подтвердить" : "Tasdiqlash"),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.dio.post(
        '/api/orders/update-status',
        data: {
          'orderId': order.id,
          'status': statusCancelled,
          'userPhone': user.phone,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (data['success'] == true) {
          ApiClient.showToast(
            lang == 'ru' ? "Заказ отменен" : "Buyurtma bekor qilindi",
            isError: false,
          );
          _fetchOrders();
        }
      }
    } catch (_) {}
  }

  void _showOrderDetails(Order order) {
    final lang = ref.read(localeProvider);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: 600,
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lang == 'ru' ? 'Детали заказа' : 'Buyurtma tafsiloti',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
                    ),
                    Text(
                      'ID: #${order.id}',
                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondaryColor, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 20),
            // Items List
            Expanded(
              child: ListView.separated(
                itemCount: order.items.length,
                separatorBuilder: (context, idx) => const Divider(height: 20),
                itemBuilder: (context, idx) {
                  final item = order.items[idx];
                  return Row(
                    children: [
                      Container(
                        width: 50,
                        height: 60,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: item.image != null
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: Image.network(item.image!, fit: BoxFit.cover),
                              )
                            : const Icon(Icons.shopping_bag_outlined, color: Colors.grey),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${item.quantity} × ${_formatPrice(item.price, lang)}',
                              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondaryColor),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        _formatPrice(item.price * item.quantity, lang),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  );
                },
              ),
            ),
            const Divider(),
            const SizedBox(height: 12),
            // Address Detail
            if (order.address != null) ...[
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, color: AppTheme.primaryColor, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      order.address!,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            // Order Status & Cancel Option
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildStatusBadge(order.status, lang),
                if (['awaiting_payment', 'accepted', 'pending', "To'lov kutilmoqda"].contains(order.status))
                  TextButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _cancelOrder(order);
                    },
                    icon: const Icon(Icons.cancel_outlined, color: Color(0xFFEF4444)),
                    label: Text(
                      lang == 'ru' ? 'Отменить' : 'Bekor qilish',
                      style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            // Total Sum
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    lang == 'ru' ? 'Итого' : 'Jami',
                    style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    _formatPrice(order.total, lang),
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status, String lang) {
    Color bg = AppTheme.primaryColor.withOpacity(0.1);
    Color text = AppTheme.primaryColor;

    if (status.toLowerCase().contains('bekor') || status.toLowerCase().contains('cancel')) {
      bg = const Color(0xFFFFF0EE);
      text = const Color(0xFFEF4444);
    } else if (status.toLowerCase().contains('kutil') || status.toLowerCase().contains('wait') || status.toLowerCase().contains('pay')) {
      bg = const Color(0xFFFFFBEB);
      text = const Color(0xFFD97706);
    } else if (status.toLowerCase().contains('yetkaz') || status.toLowerCase().contains('deliver')) {
      bg = const Color(0xFFEAF3EC);
      text = AppTheme.primaryColor;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status,
        style: TextStyle(color: text, fontSize: 11, fontWeight: FontWeight.bold),
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
    final lang = ref.watch(localeProvider);

    if (user == null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(lang == 'ru' ? 'Мои заказы' : 'Mening buyurtmalarim'),
          centerTitle: true,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF3EC),
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: const Icon(Icons.inventory_2_outlined, size: 36, color: AppTheme.primaryColor),
                ),
                const SizedBox(height: 24),
                Text(
                  lang == 'ru' ? 'Войдите для просмотра заказов' : 'Buyurtmalarni koʻrish uchun tizimga kiring',
                  style: const TextStyle(fontSize: 15, color: AppTheme.textSecondaryColor, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      context.push('/login?redirect=/orders');
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
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        title: Text(lang == 'ru' ? 'Мои заказы' : 'Mening buyurtmalarim'),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppTheme.textPrimaryColor,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchOrders,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
          : _orders.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text(
                        lang == 'ru' ? 'У вас пока нет заказов' : 'Sizda hali buyurtmalar yoʻq',
                        style: const TextStyle(color: AppTheme.textSecondaryColor),
                      ),
                      const SizedBox(height: 20),
                      TextButton(
                        onPressed: () => context.go('/'),
                        child: Text(
                          lang == 'ru' ? 'Начать покупки' : 'Xaridni boshlash',
                          style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _orders.length,
                  separatorBuilder: (context, idx) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final order = _orders[index];
                    return InkWell(
                      onTap: () => _showOrderDetails(order),
                      borderRadius: BorderRadius.circular(22),
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(color: Colors.black.withOpacity(0.04)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.02),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      lang == 'ru' ? 'Номер заказа' : 'Buyurtma ID',
                                      style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                                    ),
                                    Text(
                                      '#${order.id}',
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
                                    ),
                                  ],
                                ),
                                _buildStatusBadge(order.status, lang),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              '${order.items.length} ${lang == 'ru' ? "товаров" : "ta mahsulot"}',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(height: 16),
                            const Divider(height: 1),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _formatPrice(order.total, lang),
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimaryColor),
                                ),
                                Row(
                                  children: [
                                    Text(
                                      lang == 'ru' ? 'Детали' : 'Batafsil',
                                      style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                                    ),
                                    Icon(Icons.chevron_right, size: 16, color: Colors.grey.shade400),
                                  ],
                                ),
                              ],
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

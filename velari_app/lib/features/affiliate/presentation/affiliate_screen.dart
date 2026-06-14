import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/services.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../auth/providers/auth_provider.dart';

class AffiliateScreen extends ConsumerStatefulWidget {
  const AffiliateScreen({super.key});

  @override
  ConsumerState<AffiliateScreen> createState() => _AffiliateScreenState();
}

class _AffiliateScreenState extends ConsumerState<AffiliateScreen> {
  bool _isLoading = true;
  bool _authorized = false;
  String _step = "pin"; // pin, contract, dashboard
  Map<String, dynamic>? _affUser;
  List<dynamic> _team = [];
  String _pinCode = "";
  String? _pinError;

  // Tabs
  int _activeTab = 0; // 0: Dashboard, 1: Products, 2: Promos, 3: Links

  // Data states for tabs
  bool _isDataLoading = false;
  List<dynamic> _products = [];
  List<dynamic> _tariffs = [];
  List<dynamic> _myPromoCodes = [];
  List<dynamic> _myReferralLinks = [];
  Map<String, dynamic>? _analytics;

  // Search
  final _searchController = TextEditingController();
  List<dynamic> _filteredProducts = [];

  @override
  void initState() {
    super.initState();
    _fetchAffiliateUser();
    _searchController.addListener(_filterProducts);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchAffiliateUser() async {
    final user = ref.read(authProvider);
    if (user == null) {
      setState(() => _isLoading = false);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.dio.get('/api/affiliate/user');
      final d = response.data;
      if (d != null && d['success'] == true) {
        setState(() {
          _affUser = d['user'];
          _team = d['team'] ?? [];

          final bool hasPin = _affUser?['hasPin'] ?? false;
          final bool agreed = _affUser?['affiliate_agreed'] ?? false;

          if (!hasPin) {
            _step = "setup_pin";
          } else if (!agreed) {
            _step = "contract";
          } else if (_authorized) {
            _step = "dashboard";
          } else {
            _step = "pin";
          }
        });
      }
    } catch (e) {
      debugPrint("Error fetching affiliate user: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handlePinComplete(String pin) async {
    setState(() => _pinError = null);
    final bool hasPin = _affUser?['hasPin'] ?? false;
    final action = hasPin ? "verify_pin" : "set_pin";

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.dio.post(
        '/api/affiliate/user',
        data: {'action': action, 'pin': pin},
      );
      final d = response.data;
      if (d != null && d['success'] == true) {
        setState(() {
          _authorized = true;
          final bool agreed = _affUser?['affiliate_agreed'] ?? false;
          if (!agreed) {
            _step = "contract";
          } else {
            _step = "dashboard";
            _fetchTabDependencies();
          }
        });
        if (action == "set_pin") {
          _fetchAffiliateUser();
        }
      } else {
        setState(() {
          _pinError = d?['error'] ?? (ref.watch(localeProvider) == 'ru' ? "Неверный PIN" : "PIN-kod xato");
          _pinCode = "";
        });
      }
    } catch (e) {
      setState(() {
        _pinError = ref.watch(localeProvider) == 'ru' ? "Ошибка сети" : "Aloqa xatoligi";
        _pinCode = "";
      });
    }
  }

  Future<void> _handleAgreeContract() async {
    setState(() => _isLoading = true);
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.dio.post(
        '/api/affiliate/user',
        data: {'action': 'agree_contract'},
      );
      if (response.data?['success'] == true) {
        setState(() {
          _step = "dashboard";
        });
        _fetchAffiliateUser();
      }
    } catch (e) {
      debugPrint("Error agreeing contract: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchTabDependencies() async {
    if (_step != "dashboard") return;
    setState(() => _isDataLoading = true);
    final apiClient = ref.read(apiClientProvider);

    try {
      if (_activeTab == 1) {
        // Products
        final response = await apiClient.dio.get('/api/affiliate/products');
        if (response.data?['success'] == true) {
          setState(() {
            _products = response.data['products'] ?? [];
            _filteredProducts = _products;
          });
        }
      } else if (_activeTab == 2) {
        // Promos
        final response = await apiClient.dio.get('/api/affiliate/promo-codes');
        if (response.data?['success'] == true) {
          setState(() {
            _tariffs = response.data['tariffs'] ?? [];
            _myPromoCodes = response.data['myCodes'] ?? [];
          });
        }
      } else if (_activeTab == 3) {
        // Links & Analytics
        final linksRes = await apiClient.dio.get('/api/affiliate/links');
        final analyticsRes = await apiClient.dio.get('/api/affiliate/analytics');

        setState(() {
          if (linksRes.data?['success'] == true) {
            _myReferralLinks = linksRes.data['data'] ?? [];
          }
          if (analyticsRes.data?['success'] == true) {
            _analytics = analyticsRes.data;
          }
        });
      }
    } catch (e) {
      debugPrint("Error fetching tab data: $e");
    } finally {
      setState(() => _isDataLoading = false);
    }
  }

  void _filterProducts() {
    final query = _searchController.text.toLowerCase().trim();
    if (query.isEmpty) {
      setState(() => _filteredProducts = _products);
    } else {
      setState(() {
        _filteredProducts = _products.where((p) {
          final nameUz = (p['name_uz'] ?? p['name'] ?? '').toString().toLowerCase();
          final nameRu = (p['name_ru'] ?? p['name'] ?? '').toString().toLowerCase();
          return nameUz.contains(query) || nameRu.contains(query);
        }).toList();
      });
    }
  }

  void _pinKeyPressed(String key) {
    setState(() {
      _pinError = null;
      if (key == "delete") {
        if (_pinCode.isNotEmpty) {
          _pinCode = _pinCode.substring(0, _pinCode.length - 1);
        }
      } else {
        if (_pinCode.length < 4) {
          _pinCode += key;
        }
      }
    });

    if (_pinCode.length == 4) {
      _handlePinComplete(_pinCode);
    }
  }

  // Action methods
  Future<void> _transferToCashback(double amount) async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final response = await apiClient.dio.post(
        '/api/affiliate/user',
        data: {'action': 'transfer_to_cashback', 'amount': amount.toInt()},
      );
      if (response.data?['success'] == true) {
        ApiClient.showToast(ref.watch(localeProvider) == 'ru' ? "Успешно переведено!" : "Muvaffaqiyatli o'tkazildi!");
        _fetchAffiliateUser();
      } else {
        ApiClient.showToast(response.data?['error'] ?? "Xatolik", isError: true);
      }
    } catch (e) {
      ApiClient.showToast("Xatolik", isError: true);
    }
  }

  Future<void> _withdrawToCard(String card, double amount) async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final response = await apiClient.dio.post(
        '/api/affiliate/user',
        data: {'action': 'withdraw', 'amount': amount.toInt(), 'card_number': card},
      );
      if (response.data?['success'] == true) {
        ApiClient.showToast(ref.watch(localeProvider) == 'ru' ? "Запрос отправлен!" : "So'rov yuborildi!");
        _fetchAffiliateUser();
      } else {
        ApiClient.showToast(response.data?['error'] ?? "Xatolik", isError: true);
      }
    } catch (e) {
      ApiClient.showToast("Xatolik", isError: true);
    }
  }

  Future<void> _addTeamMember(String phone, String code) async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final response = await apiClient.dio.post(
        '/api/affiliate/user',
        data: {'action': 'add_team_member', 'memberPhone': phone, 'verificationCode': code},
      );
      if (response.data?['success'] == true) {
        ApiClient.showToast(ref.watch(localeProvider) == 'ru' ? "Агент добавлен!" : "Jamoa a'zosi qo'shildi!");
        _fetchAffiliateUser();
      } else {
        ApiClient.showToast(response.data?['error'] ?? "Xatolik", isError: true);
      }
    } catch (e) {
      ApiClient.showToast("Xatolik", isError: true);
    }
  }

  Future<void> _requestMemberCode(String phone) async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final response = await apiClient.dio.post(
        '/api/affiliate/user',
        data: {'action': 'request_member_verification', 'memberPhone': phone},
      );
      if (response.data?['success'] == true) {
        ApiClient.showToast(ref.watch(localeProvider) == 'ru' ? "Код отправлен в Telegram!" : "Kod Telegram'ga yuborildi!");
      } else {
        ApiClient.showToast(response.data?['error'] ?? "Xatolik", isError: true);
      }
    } catch (e) {
      ApiClient.showToast("Xatolik", isError: true);
    }
  }

  Future<void> _createPromoCode(String tariffId, String customCode) async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final response = await apiClient.dio.post(
        '/api/affiliate/promo-codes',
        data: {'tariffId': tariffId, 'customCode': customCode},
      );
      if (response.data?['success'] == true) {
        ApiClient.showToast(ref.watch(localeProvider) == 'ru' ? "Промокод создан!" : "Promo-kod yaratildi!");
        _fetchTabDependencies();
      } else {
        ApiClient.showToast(response.data?['error'] ?? "Xatolik", isError: true);
      }
    } catch (e) {
      ApiClient.showToast("Xatolik", isError: true);
    }
  }

  Future<void> _createReferralLink(Map<String, dynamic> product) async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final response = await apiClient.dio.post(
        '/api/affiliate/links',
        data: {'productId': product['id']},
      );
      final d = response.data;
      if (d != null && d['success'] == true) {
        final slug = d['data']['slug'];
        final linkUrl = "https://velari.uz/ref/$slug";
        _showLinkGeneratedDialog(product, linkUrl);
      }
    } catch (e) {
      ApiClient.showToast("Xatolik", isError: true);
    }
  }

  void _showLinkGeneratedDialog(Map<String, dynamic> product, String linkUrl) {
    final lang = ref.read(localeProvider);
    final pName = lang == 'ru'
        ? (product['name_ru'] ?? product['name'] ?? '')
        : (product['name_uz'] ?? product['name'] ?? '');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        title: Text(lang == 'ru' ? 'Ссылка создана' : 'Havola yaratildi'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              pName,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F0),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                linkUrl,
                style: const TextStyle(fontSize: 13, color: AppTheme.textPrimaryColor, fontFamily: 'monospace'),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(lang == 'ru' ? 'Закрыть' : 'Yopish'),
          ),
          ElevatedButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: linkUrl));
              ApiClient.showToast(context.tr('affiliate.copied', ref));
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(lang == 'ru' ? 'Копировать' : 'Nusxalash'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryColor),
        ),
      );
    }

    if (_step == "pin" || _step == "setup_pin") {
      return Scaffold(
        backgroundColor: const Color(0xFFFAFAF6),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimaryColor),
            onPressed: () => context.pop(),
          ),
        ),
        body: _buildPinKeypadView(),
      );
    }

    if (_step == "contract") {
      return Scaffold(
        backgroundColor: const Color(0xFFFAFAF6),
        body: _buildContractView(),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        title: Text(context.tr('affiliate.title', ref)),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: AppTheme.textPrimaryColor,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          // Tab bar selector
          _buildTabsHeader(),
          
          Expanded(
            child: _isDataLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                : _buildTabContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildPinKeypadView() {
    final lang = ref.watch(localeProvider);
    final bool isSetup = _step == "setup_pin";

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.security, size: 64, color: AppTheme.primaryColor),
          const SizedBox(height: 20),
          Text(
            isSetup
                ? (lang == 'ru' ? "Установите PIN-код для партнерства" : "Hamkorlik uchun PIN-kod o'rnating")
                : (lang == 'ru' ? "Введите PIN-код партнерства" : "Hamkorlik PIN-kodini kiriting"),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
          ),
          const SizedBox(height: 24),
          // PIN indicators
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(4, (index) {
              final hasDigit = index < _pinCode.length;
              return Container(
                width: 18,
                height: 18,
                margin: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: hasDigit ? AppTheme.primaryColor : Colors.grey.shade300,
                ),
              );
            }),
          ),
          const SizedBox(height: 10),
          if (_pinError != null)
            Text(
              _pinError!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.w500),
            ),
          const SizedBox(height: 40),
          // Grid Keypad
          _buildPinKeyboardGrid(),
        ],
      ),
    );
  }

  Widget _buildPinKeyboardGrid() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: ["1", "2", "3"].map((k) => _buildKeypadButton(k)).toList(),
        ),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: ["4", "5", "6"].map((k) => _buildKeypadButton(k)).toList(),
        ),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: ["7", "8", "9"].map((k) => _buildKeypadButton(k)).toList(),
        ),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            const SizedBox(width: 72, height: 60),
            _buildKeypadButton("0"),
            _buildKeypadButton("delete", icon: Icons.backspace_outlined),
          ],
        ),
      ],
    );
  }

  Widget _buildKeypadButton(String key, {IconData? icon}) {
    return Container(
      width: 72,
      height: 60,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.015),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _pinKeyPressed(key),
          child: Center(
            child: icon != null
                ? Icon(icon, color: AppTheme.textPrimaryColor, size: 20)
                : Text(
                    key,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildContractView() {
    final lang = ref.watch(localeProvider);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: const Color(0xFFEAF3EC),
              borderRadius: BorderRadius.circular(22),
            ),
            child: const Icon(Icons.shield, color: AppTheme.primaryColor, size: 36),
          ),
          const SizedBox(height: 24),
          Text(
            lang == 'ru' ? 'Партнерское Соглашение' : 'Hamkorlik Shartnomasi',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 10),
          Text(
            lang == 'ru' ? 'Пожалуйста, ознакомьтесь с условиями участия:' : 'Iltimos, ishtirok etish shartlari bilan tanishing:',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondaryColor, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.black.withOpacity(0.04)),
              ),
              child: SingleChildScrollView(
                child: Text(
                  lang == 'ru'
                      ? "1. Вы можете получать реальный доход от продаж партнерских товаров.\n"
                          "2. Размер вознаграждения определяется тарифом комиссии.\n"
                          "3. Покупка товаров по собственным ссылкам (автофрод) запрещена.\n"
                          "4. Средства доступны для вывода через 14 дней после завершения заказа.\n"
                          "5. Администрация оставляет за собой право блокировать аккаунты при нарушении правил."
                      : "1. Siz hamkorlik havolalari orqali sotilgan mahsulotlardan real daromad olishingiz mumkin.\n"
                          "2. Komissiya miqdori belgilangan tariflar bo'yicha hisoblanadi.\n"
                          "3. O'z havolalaringiz orqali mahsulot sotib olish (avtofrod) taqiqlanadi.\n"
                          "4. Buyurtma yetkazib berilgach, mablag' 14 kundan keyin yechib olishga ruxsat etiladi.\n"
                          "5. Qoidalar buzilganda, ma'muriyat hisobingizni bloklash huquqini saqlab qoladi.",
                  style: const TextStyle(fontSize: 13, height: 1.6, color: AppTheme.textPrimaryColor),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _handleAgreeContract,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            ),
            child: Text(
              lang == 'ru' ? 'Я ПРИНИМАЮ УСЛОВИЯ' : 'ROZIMAN VA DAVOM ETAMAN',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabsHeader() {
    final lang = ref.watch(localeProvider);
    final tabs = [
      {'id': 0, 'label': lang == 'ru' ? 'Главная' : 'Asosiy', 'icon': Icons.dashboard_outlined},
      {'id': 1, 'label': lang == 'ru' ? 'Товары' : 'Mahsulotlar', 'icon': Icons.shopping_bag_outlined},
      {'id': 2, 'label': lang == 'ru' ? 'Промокоды' : 'Promo-kodlar', 'icon': Icons.confirmation_number_outlined},
      {'id': 3, 'label': lang == 'ru' ? 'Ссылки' : 'Havolalar', 'icon': Icons.link},
    ];

    return Container(
      height: 56,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.black.withOpacity(0.03)),
      ),
      child: Row(
        children: tabs.map((t) {
          final isSelected = _activeTab == t['id'];
          return Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _activeTab = t['id'] as int;
                });
                _fetchTabDependencies();
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: isSelected ? AppTheme.primaryColor : Colors.transparent,
                  borderRadius: BorderRadius.circular(14),
                ),
                alignment: Alignment.center,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      t['icon'] as IconData,
                      size: 16,
                      color: isSelected ? Colors.white : Colors.grey.shade400,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      t['label'] as String,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTabContent() {
    switch (_activeTab) {
      case 0:
        return _buildDashboardTab();
      case 1:
        return _buildProductsTab();
      case 2:
        return _buildPromosTab();
      case 3:
        return _buildLinksTab();
      default:
        return const SizedBox.shrink();
    }
  }

  // Dashboard tab
  Widget _buildDashboardTab() {
    final lang = ref.watch(localeProvider);
    final code = _affUser?['affiliate_code'] ?? "KOD_YO'Q";

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Balance card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppTheme.primaryColor, Color(0xFF1F5A30)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(28),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    context.tr('affiliate.commission', ref).toUpperCase(),
                    style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                  const Icon(Icons.payments_outlined, color: Colors.white, size: 24),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                _formatPrice((_affUser?['real_balance'] as num? ?? 0).toDouble(), lang),
                style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _showWithdrawDialog,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white.withOpacity(0.15),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: Text(
                        lang == 'ru' ? 'Вывод средств' : 'Pul yechish',
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _showTransferDialog,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: Text(
                        lang == 'ru' ? 'В кэшбэк' : "Hamyonga o'tkazish",
                        style: const TextStyle(color: AppTheme.primaryColor, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Referral Code box
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.black.withOpacity(0.04)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    lang == 'ru' ? "РЕФЕРАЛЬНЫЙ КОД" : "REFERAL KODINGIZ",
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade400),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    code,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, color: AppTheme.primaryColor),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.copy, color: AppTheme.primaryColor),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: code));
                  ApiClient.showToast(context.tr('affiliate.copied', ref));
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Team members header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              lang == 'ru' ? 'МОЯ КОМАНДА' : 'MENING JAMOAM',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade400, letterSpacing: 0.5),
            ),
            if (_affUser?['affiliate_role'] != 'agent')
              TextButton.icon(
                onPressed: _showAddMemberDialog,
                icon: const Icon(Icons.add, size: 16, color: AppTheme.primaryColor),
                label: Text(
                  lang == 'ru' ? 'Добавить' : 'Qoʻshish',
                  style: const TextStyle(color: AppTheme.primaryColor, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),

        if (_team.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 30),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.black.withOpacity(0.03)),
            ),
            alignment: Alignment.center,
            child: Text(
              lang == 'ru' ? "В команде пока никого нет" : "Hozircha jamoada hech kim yoʻq",
              style: TextStyle(color: Colors.grey.shade400, fontSize: 13),
            ),
          )
        else
          ..._team.map((m) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.black.withOpacity(0.04)),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                    child: Text(
                      (m['name'] ?? m['phone'] ?? '?')[0].toUpperCase(),
                      style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m['name'] ?? m['phone'] ?? '',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          m['affiliate_role']?.toString().toUpperCase() ?? '',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey.shade400),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.trending_up, color: AppTheme.primaryColor, size: 20),
                ],
              ),
            );
          }),
      ],
    );
  }

  // Products Tab
  Widget _buildProductsTab() {
    final lang = ref.watch(localeProvider);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: TextField(
            controller: _searchController,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              hintText: context.tr('affiliate.productSearchPlaceholder', ref),
              prefixIcon: const Icon(Icons.search, color: Colors.grey),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(22),
                borderSide: BorderSide(color: Colors.black.withOpacity(0.04)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(22),
                borderSide: BorderSide(color: Colors.black.withOpacity(0.04)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(22),
                borderSide: const BorderSide(color: AppTheme.primaryColor),
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
        Expanded(
          child: _filteredProducts.isEmpty
              ? Center(child: Text(lang == 'ru' ? "Товары не найдены" : "Mahsulotlar topilmadi"))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _filteredProducts.length,
                  itemBuilder: (context, index) {
                    final p = _filteredProducts[index];
                    final pName = lang == 'ru'
                        ? (p['name_ru'] ?? p['name'] ?? '')
                        : (p['name_uz'] ?? p['name'] ?? '');
                    final price = (p['price'] as num? ?? 0).toDouble();

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.black.withOpacity(0.04)),
                      ),
                      child: Row(
                        children: [
                          if (p['image'] != null)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.network(
                                p['image'],
                                width: 50,
                                height: 50,
                                fit: BoxFit.cover,
                                errorBuilder: (c, o, s) => Container(width: 50, height: 50, color: Colors.grey.shade100),
                              ),
                            ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  pName,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _formatPrice(price, lang),
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.primaryColor),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: () => _createReferralLink(p),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              elevation: 0,
                            ),
                            child: Text(
                              lang == 'ru' ? 'Ссылка' : 'Havola',
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  // Promos Tab
  Widget _buildPromosTab() {
    final lang = ref.watch(localeProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              context.tr('affiliate.activePromos', ref).toUpperCase(),
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade400, letterSpacing: 0.5),
            ),
            TextButton.icon(
              onPressed: _showCreatePromoDialog,
              icon: const Icon(Icons.add, size: 16, color: AppTheme.primaryColor),
              label: Text(
                lang == 'ru' ? 'Создать' : 'Yaratish',
                style: const TextStyle(color: AppTheme.primaryColor, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        if (_myPromoCodes.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 40),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.black.withOpacity(0.04)),
            ),
            alignment: Alignment.center,
            child: Text(
              lang == 'ru' ? "У вас пока нет промокодов" : "Hozircha promo-kodlaringiz yoʻq",
              style: TextStyle(color: Colors.grey.shade400, fontSize: 13),
            ),
          )
        else
          ..._myPromoCodes.map((p) {
            final tName = lang == 'ru'
                ? (p['tariff']?['name_ru'] ?? p['tariff']?['name'] ?? '')
                : (p['tariff']?['name_uz'] ?? p['tariff']?['name'] ?? '');

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.black.withOpacity(0.04)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.confirmation_number_outlined, color: Color(0xFFF59E0B)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p['code']?.toString().toUpperCase() ?? '',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppTheme.textPrimaryColor),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          tName,
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, color: AppTheme.primaryColor),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: p['code'] ?? ''));
                      ApiClient.showToast(context.tr('affiliate.copied', ref));
                    },
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  // Links Tab
  Widget _buildLinksTab() {
    final lang = ref.watch(localeProvider);

    // Clicks & Conversions Stats
    final clicks = _analytics?['clicks'] ?? 0;
    final conversions = _analytics?['conversions'] ?? 0;
    final convRate = clicks > 0 ? (conversions / clicks * 100).toStringAsFixed(1) : "0.0";

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Analytics Row
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                context.tr('affiliate.clicks', ref),
                clicks.toString(),
                Icons.mouse_outlined,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildStatCard(
                context.tr('affiliate.conversions', ref),
                conversions.toString(),
                Icons.trending_up,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildStatCard(
                context.tr('affiliate.convRate', ref),
                "$convRate%",
                Icons.percent,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        Text(
          context.tr('affiliate.activeLinks', ref).toUpperCase(),
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade400, letterSpacing: 0.5),
        ),
        const SizedBox(height: 10),

        if (_myReferralLinks.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 40),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.black.withOpacity(0.04)),
            ),
            alignment: Alignment.center,
            child: Text(
              lang == 'ru' ? "У вас пока нет созданных ссылок" : "Hozircha yaratilgan havolalaringiz yoʻq",
              style: TextStyle(color: Colors.grey.shade400, fontSize: 13),
            ),
          )
        else
          ..._myReferralLinks.map((l) {
            final slug = l['slug'] ?? '';
            final linkUrl = "https://velari.uz/ref/$slug";
            final pName = lang == 'ru'
                ? (l['product']?['name_ru'] ?? l['product']?['name'] ?? '')
                : (l['product']?['name_uz'] ?? l['product']?['name'] ?? '');

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.black.withOpacity(0.04)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEAF3EC),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.link, color: AppTheme.primaryColor),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          pName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Text(
                              "${lang == 'ru' ? 'Кликов' : 'Bosishlar'}: ${l['clicks'] ?? 0}",
                              style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              "${lang == 'ru' ? 'Продаж' : 'Sotuvlar'}: ${l['conversions'] ?? 0}",
                              style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, color: AppTheme.primaryColor),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: linkUrl));
                      ApiClient.showToast(context.tr('affiliate.copied', ref));
                    },
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.black.withOpacity(0.03)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppTheme.primaryColor, size: 18),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, color: AppTheme.textPrimaryColor),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 9, color: Colors.grey.shade400, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  // Modals dialogs
  void _showWithdrawDialog() {
    final lang = ref.read(localeProvider);
    final cardController = TextEditingController();
    final amountController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text(lang == 'ru' ? 'Вывод на карту' : 'Kartaga yechish'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: cardController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                hintText: '8600 0000 0000 0000',
                labelText: 'Uzcard/Humo',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                hintText: 'Summa...',
                labelText: lang == 'ru' ? 'Сумма' : 'Summa',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(lang == 'ru' ? 'Отмена' : 'Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () {
              final amount = double.tryParse(amountController.text) ?? 0.0;
              final card = cardController.text.replaceAll(' ', '');
              if (card.isNotEmpty && amount >= 1000) {
                _withdrawToCard(card, amount);
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(lang == 'ru' ? 'Подтвердить' : 'Tasdiqlash'),
          ),
        ],
      ),
    );
  }

  void _showTransferDialog() {
    final lang = ref.read(localeProvider);
    final amountController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text(lang == 'ru' ? 'Перевод на cashback баланс' : "Cashback balansga o'tkazish"),
        content: TextField(
          controller: amountController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: 'Summa...',
            labelText: lang == 'ru' ? 'Сумма' : 'Summa',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(lang == 'ru' ? 'Отмена' : 'Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () {
              final amount = double.tryParse(amountController.text) ?? 0.0;
              if (amount >= 1000) {
                _transferToCashback(amount);
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(lang == 'ru' ? 'Подтвердить' : 'Tasdiqlash'),
          ),
        ],
      ),
    );
  }

  void _showAddMemberDialog() {
    final lang = ref.read(localeProvider);
    final phoneController = TextEditingController();
    final codeController = TextEditingController();
    bool codeRequested = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateDialog) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text(lang == 'ru' ? 'Добавить в команду' : "Jamoaga qo'shish"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                enabled: !codeRequested,
                decoration: const InputDecoration(
                  hintText: '998901234567',
                  labelText: 'Phone',
                ),
              ),
              if (codeRequested) ...[
                const SizedBox(height: 12),
                TextField(
                  controller: codeController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: lang == 'ru' ? 'Код из Telegram...' : 'Telegram bot kodi...',
                    labelText: 'Code',
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(lang == 'ru' ? 'Отмена' : 'Bekor qilish'),
            ),
            ElevatedButton(
              onPressed: () async {
                final phone = phoneController.text.trim();
                if (!codeRequested) {
                  if (phone.isNotEmpty) {
                    await _requestMemberCode(phone);
                    setStateDialog(() {
                      codeRequested = true;
                    });
                  }
                } else {
                  final code = codeController.text.trim();
                  if (phone.isNotEmpty && code.isNotEmpty) {
                    await _addTeamMember(phone, code);
                    Navigator.pop(context);
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(
                !codeRequested
                    ? (lang == 'ru' ? 'Получить код' : 'Kodni olish')
                    : (lang == 'ru' ? 'Добавить' : 'Qoʻshish'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreatePromoDialog() {
    final lang = ref.read(localeProvider);
    final codeController = TextEditingController();
    dynamic selectedTariffLocal;

    if (_tariffs.isNotEmpty) {
      selectedTariffLocal = _tariffs[0];
    }

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateDialog) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text(lang == 'ru' ? 'Создать промокод' : 'Promo-kod yaratish'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: codeController,
                decoration: InputDecoration(
                  hintText: 'MYCODE2026',
                  labelText: lang == 'ru' ? 'Код (латиница)' : 'Kod (lotin tilida)',
                ),
              ),
              const SizedBox(height: 12),
              if (_tariffs.isNotEmpty)
                DropdownButton<dynamic>(
                  value: selectedTariffLocal,
                  isExpanded: true,
                  onChanged: (val) {
                    setStateDialog(() {
                      selectedTariffLocal = val;
                    });
                  },
                  items: _tariffs.map((t) {
                    final label = lang == 'ru'
                        ? (t['name_ru'] ?? t['name'] ?? '')
                        : (t['name_uz'] ?? t['name'] ?? '');
                    return DropdownMenuItem<dynamic>(
                      value: t,
                      child: Text(
                        label,
                        style: const TextStyle(fontSize: 13),
                      ),
                    );
                  }).toList(),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(lang == 'ru' ? 'Отмена' : 'Bekor qilish'),
            ),
            ElevatedButton(
              onPressed: () {
                final code = codeController.text.toUpperCase().trim();
                if (code.isNotEmpty && selectedTariffLocal != null) {
                  _createPromoCode(selectedTariffLocal['id'].toString(), code);
                  Navigator.pop(context);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(lang == 'ru' ? 'Создать' : 'Yaratish'),
            ),
          ],
        ),
      ),
    );
  }

  String _formatPrice(double amount, String lang) {
    final formatted = amount.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]} ',
        );
    return '$formatted ${lang == 'ru' ? 'сум' : "so'm"}';
  }
}

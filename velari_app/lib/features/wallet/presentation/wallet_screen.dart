import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/api/api_client.dart';
import '../../auth/providers/auth_provider.dart';

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  bool _isLoading = true;
  double _balance = 0.0;
  double _pendingCashback = 0.0;
  List<Map<String, dynamic>> _transactions = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchWalletData();
  }

  Future<void> _fetchWalletData() async {
    final user = ref.read(authProvider);
    if (user == null) {
      setState(() => _isLoading = false);
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final supabase = ref.read(supabaseClientProvider);
      final cleanPhone = user.phone.replaceAll(RegExp(r'\D'), '');

      // 1. Fetch Balance
      final walletRes = await supabase
          .from('user_wallets')
          .select('balance')
          .eq('user_phone', cleanPhone)
          .maybeSingle();

      double bal = 0.0;
      if (walletRes != null && walletRes['balance'] != null) {
        bal = (walletRes['balance'] as num).toDouble();
      }

      // 2. Fetch Pending Cashback
      final pendingRes = await supabase
          .from('orders')
          .select('potential_cashback')
          .eq('user_phone', user.phone)
          .neq('status', 'Yetkazildi')
          .gt('potential_cashback', 0);

      double pending = 0.0;
      if (pendingRes != null) {
        for (final o in pendingRes as List) {
          pending += (o['potential_cashback'] as num).toDouble();
        }
      }

      // 3. Fetch Cashback Transactions
      final cashbackTxRes = await supabase
          .from('cashback_transactions')
          .select('*')
          .eq('user_phone', user.phone);

      // 4. Fetch Transfers
      final transfersRes = await supabase
          .from('wallet_transfers')
          .select('*')
          .or('sender_phone.eq.$cleanPhone,receiver_phone.eq.$cleanPhone');

      // 5. Combine History
      final List<Map<String, dynamic>> txList = [];
      if (cashbackTxRes != null) {
        for (final c in cashbackTxRes as List) {
          txList.add({
            'type': 'cashback',
            'amount': (c['amount'] as num).toDouble(),
            'date': c['created_at']?.toString() ?? '',
            'description': (lang) => lang == 'ru' ? 'Кэшбэк начислен' : 'Keshbek toʻplandi',
            'isPositive': true,
          });
        }
      }

      if (transfersRes != null) {
        for (final t in transfersRes as List) {
          final isOutgoing = t['sender_phone']?.toString() == cleanPhone;
          final amt = (t['amount'] as num).toDouble();
          final otherParty = isOutgoing ? t['receiver_phone'] : t['sender_phone'];
          txList.add({
            'type': 'transfer',
            'amount': amt,
            'date': t['created_at']?.toString() ?? '',
            'description': (lang) => isOutgoing
                ? (lang == 'ru' ? 'Перевод на +$otherParty' : '+$otherParty raqamiga oʻtkazma')
                : (lang == 'ru' ? 'Перевод от +$otherParty' : '+$otherParty raqamidan oʻtkazma'),
            'isPositive': !isOutgoing,
          });
        }
      }

      // Sort by date descending
      txList.sort((a, b) => b['date'].toString().compareTo(a['date'].toString()));

      setState(() {
        _balance = bal;
        _pendingCashback = pending;
        _transactions = txList;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = "Hamyon ma'lumotlarini yuklab bo'lmadi";
        _isLoading = false;
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

  void _openTransferSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => TransferBottomSheet(
        onSuccess: () {
          _fetchWalletData();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);

    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryColor),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        title: Text(context.tr('wallet.title', ref)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppTheme.textPrimaryColor,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchWalletData,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Balance Card (Velari premium green gradient)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryColor, Color(0xFF1F5A30)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.25),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        context.tr('wallet.balance', ref).toUpperCase(),
                        style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                      ),
                      const Icon(Icons.wallet, color: Colors.white, size: 24),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _formatPrice(_balance, lang),
                    style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      // Pending
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                context.tr('wallet.pending', ref),
                                style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '+${_formatPrice(_pendingCashback, lang)}',
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      // User
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                context.tr('wallet.user', ref),
                                style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                ref.read(authProvider)?.name ?? 'Mijoz',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Transfer money button (Premium styled tile)
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.black.withOpacity(0.04)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.01),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _openTransferSheet,
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFFEAF3EC),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.swap_horiz, color: AppTheme.primaryColor, size: 24),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                context.tr('wallet.transfer', ref),
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                context.tr('wallet.transferHint', ref),
                                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondaryColor),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: Colors.grey),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // History header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  context.tr('wallet.history', ref).toUpperCase(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade400,
                    letterSpacing: 0.5,
                  ),
                ),
                Icon(Icons.history, size: 18, color: Colors.grey.shade400),
              ],
            ),
            const SizedBox(height: 12),

            if (_error != null)
              Center(
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              )
            else if (_transactions.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 40),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: Colors.black.withOpacity(0.04)),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.history_toggle_off, size: 48, color: Colors.grey.shade300),
                    const SizedBox(height: 12),
                    Text(
                      context.tr('wallet.noTx', ref),
                      style: const TextStyle(color: AppTheme.textSecondaryColor, fontSize: 13),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _transactions.length,
                separatorBuilder: (context, idx) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final tx = _transactions[index];
                  final isPositive = tx['isPositive'] as bool;
                  final amount = tx['amount'] as double;
                  final descFunc = tx['description'] as String Function(String);
                  final desc = descFunc(lang);

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.black.withOpacity(0.04)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: isPositive ? const Color(0xFFEAF3EC) : const Color(0xFFFFF0EE),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            isPositive ? Icons.add : Icons.remove,
                            color: isPositive ? AppTheme.primaryColor : const Color(0xFFEF4444),
                            size: 16,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                desc,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                tx['date'].toString().split('T')[0],
                                style: TextStyle(color: Colors.grey.shade400, fontSize: 10),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '${isPositive ? '+' : '-'}${_formatPrice(amount, lang)}',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isPositive ? AppTheme.primaryColor : const Color(0xFFEF4444),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class TransferBottomSheet extends ConsumerStatefulWidget {
  final VoidCallback onSuccess;
  const TransferBottomSheet({super.key, required this.onSuccess});

  @override
  ConsumerState<TransferBottomSheet> createState() => _TransferBottomSheetState();
}

class _TransferBottomSheetState extends ConsumerState<TransferBottomSheet> {
  final _phoneController = TextEditingController();
  final _amountController = TextEditingController();
  bool _isGift = false;
  int _transferStep = 1; // 1: Input, 2: OTP (PinKeypad)
  String _otpCode = "";
  bool _isProcessing = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _handleTransferRequest() async {
    final phone = _phoneController.text.trim();
    final amountText = _amountController.text.trim();
    final amount = double.tryParse(amountText) ?? 0.0;

    if (phone.isEmpty || amount < 1000) {
      setState(() {
        _error = ref.watch(localeProvider) == 'ru'
            ? "Минимум: 1 000 сум"
            : "Minimal o'tkazma: 1 000 so'm";
      });
      return;
    }

    setState(() {
      _isProcessing = true;
      _error = null;
    });

    try {
      final user = ref.read(authProvider);
      final apiClient = ref.read(apiClientProvider);

      final response = await apiClient.dio.post(
        '/api/wallet/transfer/request',
        data: {
          'senderPhone': user?.phone,
          'receiverPhone': phone,
          'amount': amount.toInt(),
          'isGift': _isGift,
        },
      );

      final data = response.data;
      if (data != null && data['success'] == true) {
        setState(() {
          _transferStep = 2;
        });
      } else {
        setState(() {
          _error = data?['message'] ?? (ref.watch(localeProvider) == 'ru' ? "Ошибка запроса" : "So'rovda xatolik");
        });
      }
    } catch (e) {
      setState(() {
        _error = ref.watch(localeProvider) == 'ru' ? "Сетевая ошибка" : "Tarmoq xatoligi yuz berdi";
      });
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<void> _handleTransferConfirm() async {
    if (_otpCode.length < 6) return;

    setState(() {
      _isProcessing = true;
      _error = null;
    });

    try {
      final user = ref.read(authProvider);
      final phone = _phoneController.text.trim();
      final amount = double.tryParse(_amountController.text.trim()) ?? 0.0;
      final apiClient = ref.read(apiClientProvider);

      final response = await apiClient.dio.post(
        '/api/wallet/transfer/confirm',
        data: {
          'senderPhone': user?.phone,
          'receiverPhone': phone,
          'amount': amount.toInt(),
          'code': _otpCode,
        },
      );

      final data = response.data;
      if (data != null && data['success'] == true) {
        ApiClient.showToast(context.tr('wallet.success', ref));
        widget.onSuccess();
        Navigator.pop(context);
      } else {
        setState(() {
          _error = data?['message'] ?? (ref.watch(localeProvider) == 'ru' ? "Неверный код" : "Notoʻgʻri kod");
          _otpCode = ""; // Reset OTP code
        });
      }
    } catch (e) {
      setState(() {
        _error = ref.watch(localeProvider) == 'ru' ? "Ошибка подтверждения" : "Tasdiqlashda xatolik yuz berdi";
        _otpCode = "";
      });
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  void _keypadKeyPress(String key) {
    if (_isProcessing) return;
    setState(() {
      _error = null;
      if (key == "delete") {
        if (_otpCode.isNotEmpty) {
          _otpCode = _otpCode.substring(0, _otpCode.length - 1);
        }
      } else {
        if (_otpCode.length < 6) {
          _otpCode += key;
        }
      }
    });

    if (_otpCode.length == 6) {
      _handleTransferConfirm();
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, bottomInset + 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
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
          const SizedBox(height: 20),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _transferStep == 1
                    ? context.tr('wallet.modalTitle', ref)
                    : context.tr('wallet.modal2fa', ref),
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Error Banner
          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0EE),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFFC1BA)),
              ),
              child: Text(
                _error!,
                style: const TextStyle(color: Color(0xFFEF4444), fontSize: 13, fontWeight: FontWeight.w500),
              ),
            ),
            const SizedBox(height: 16),
          ],

          if (_transferStep == 1) ...[
            // Form View
            Text(
              context.tr('wallet.phoneLabel', ref),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textSecondaryColor),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                hintText: context.tr('wallet.phonePlaceholder', ref),
                hintStyle: TextStyle(color: Colors.grey.shade400, fontWeight: FontWeight.normal),
                filled: true,
                fillColor: const Color(0xFFF5F5F0),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              ),
            ),
            const SizedBox(height: 16),

            Text(
              context.tr('wallet.amountLabel', ref),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textSecondaryColor),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                hintText: context.tr('wallet.amountPlaceholder', ref),
                hintStyle: TextStyle(color: Colors.grey.shade400, fontWeight: FontWeight.normal),
                filled: true,
                fillColor: const Color(0xFFF5F5F0),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              ),
            ),
            const SizedBox(height: 20),

            // Gift Checkbox button
            Container(
              decoration: BoxDecoration(
                color: _isGift ? const Color(0xFFFFFBEB) : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _isGift ? const Color(0xFFF59E0B) : Colors.black.withOpacity(0.06),
                  width: 1.5,
                ),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () {
                    setState(() {
                      _isGift = !_isGift;
                    });
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    child: Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: _isGift ? const Color(0xFFF59E0B) : const Color(0xFFF5F5F0),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            _isGift ? Icons.star : Icons.star_border,
                            color: _isGift ? Colors.white : Colors.grey.shade400,
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          context.tr('wallet.isGift', ref),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: _isGift ? const Color(0xFFB45309) : AppTheme.textSecondaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: _isProcessing ? null : _handleTransferRequest,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                elevation: 0,
              ),
              child: _isProcessing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Text(
                      context.tr('wallet.continue', ref),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                    ),
            ),
          ] else ...[
            // OTP Verification with Premium PinKeypad
            const SizedBox(height: 10),
            Text(
              context.tr('wallet.otpHint', ref),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondaryColor),
            ),
            const SizedBox(height: 20),

            // OTP PIN indicators
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(6, (index) {
                final hasDigit = index < _otpCode.length;
                final digit = hasDigit ? _otpCode[index] : "";
                return Container(
                  width: 44,
                  height: 52,
                  margin: const EdgeInsets.symmetric(horizontal: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F5F0),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: index == _otpCode.length
                          ? AppTheme.primaryColor
                          : Colors.transparent,
                      width: 1.5,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    digit,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 32),

            // Custom Tactile PinKeypad
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: ["1", "2", "3"].map((k) => _buildKeypadKey(k)).toList(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: ["4", "5", "6"].map((k) => _buildKeypadKey(k)).toList(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: ["7", "8", "9"].map((k) => _buildKeypadKey(k)).toList(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildKeypadKey(""), // Spacer
                      _buildKeypadKey("0"),
                      _buildKeypadKey("delete", icon: Icons.backspace_outlined),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (_isProcessing)
              const Center(
                child: CircularProgressIndicator(color: AppTheme.primaryColor),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildKeypadKey(String key, {IconData? icon}) {
    if (key.isEmpty && icon == null) {
      return const SizedBox(width: 68, height: 60);
    }

    return Container(
      width: 68,
      height: 60,
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAF6),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.black.withOpacity(0.02)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _keypadKeyPress(key),
          child: Center(
            child: icon != null
                ? Icon(icon, color: AppTheme.textPrimaryColor, size: 20)
                : Text(
                    key,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

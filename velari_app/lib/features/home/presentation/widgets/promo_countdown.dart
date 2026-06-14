import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class PromoCountdown extends StatefulWidget {
  final String language;
  final String? variant; // 'banner' or 'card'

  const PromoCountdown({
    super.key,
    required this.language,
    this.variant = 'card',
  });

  @override
  State<PromoCountdown> createState() => _PromoCountdownState();
}

class _PromoCountdownState extends State<PromoCountdown> {
  Timer? _timer;
  Duration _timeRemaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _calculateTimeRemaining();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _calculateTimeRemaining();
    });
  }

  void _calculateTimeRemaining() {
    final now = DateTime.now();
    // Default: Countdown to end of today (midnight)
    final midnight = DateTime(now.year, now.month, now.day + 1);
    if (mounted) {
      setState(() {
        _timeRemaining = midnight.difference(now);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _formatNumber(int number) {
    return number.toString().padLeft(2, '0');
  }

  @override
  Widget build(BuildContext context) {
    final hours = _formatNumber(_timeRemaining.inHours);
    final minutes = _formatNumber(_timeRemaining.inMinutes.remainder(60));
    final seconds = _formatNumber(_timeRemaining.inSeconds.remainder(60));
    
    final isUz = widget.language == 'uz';
    final title = isUz ? 'KUN AKSİYASI' : 'АКЦИЯ ДНЯ';
    final desc = isUz ? 'Chegirma tugashiga qoldi:' : 'До конца скидки осталось:';

    if (widget.variant == 'banner') {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.errorColor.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.errorColor.withOpacity(0.2)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppTheme.errorColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: const TextStyle(
                    color: AppTheme.textPrimaryColor,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
            Row(
              children: [
                _buildTimeBox(hours),
                const Text(':', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.errorColor)),
                _buildTimeBox(minutes),
                const Text(':', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.errorColor)),
                _buildTimeBox(seconds),
              ],
            ),
          ],
        ),
      );
    }

    // Default: Card style
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: AppTheme.premiumCardDecoration.copyWith(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFFFF5F5),
            Color(0xFFFFF0F0),
          ],
        ),
        border: Border.all(color: const Color(0xFFFEE2E2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.bolt, color: AppTheme.errorColor),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(
                  color: AppTheme.errorColor,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            desc,
            style: const TextStyle(
              color: AppTheme.textSecondaryColor,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildTimeBox(hours),
              const SizedBox(width: 4),
              const Text(':', style: TextStyle(fontWeight: FontWeight.w900, color: AppTheme.errorColor, fontSize: 18)),
              const SizedBox(width: 4),
              _buildTimeBox(minutes),
              const SizedBox(width: 4),
              const Text(':', style: TextStyle(fontWeight: FontWeight.w900, color: AppTheme.errorColor, fontSize: 18)),
              const SizedBox(width: 4),
              _buildTimeBox(seconds),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimeBox(String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.errorColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        value,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 16,
        ),
      ),
    );
  }
}

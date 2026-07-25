import 'package:flutter/material.dart';
import '../../../../core/models/brand.dart';
import '../../../../core/theme/app_theme.dart';

class CatalogFilterSheet extends StatefulWidget {
  final String lang;
  final List<Brand> brands;
  final double maxProductPrice;
  final List<String> initialSelectedBrands;
  final double initialMinRating;
  final double initialMinPrice;
  final double initialMaxPrice;
  final Function(List<String>, double, double, double) onApply;

  const CatalogFilterSheet({
    super.key,
    required this.lang,
    required this.brands,
    required this.maxProductPrice,
    required this.initialSelectedBrands,
    required this.initialMinRating,
    required this.initialMinPrice,
    required this.initialMaxPrice,
    required this.onApply,
  });

  @override
  State<CatalogFilterSheet> createState() => _CatalogFilterSheetState();
}

class _CatalogFilterSheetState extends State<CatalogFilterSheet> {
  late List<String> _draftBrands;
  late double _draftMinRating;
  late double _draftMinPrice;
  late double _draftMaxPrice;

  @override
  void initState() {
    super.initState();
    _draftBrands = List.from(widget.initialSelectedBrands);
    _draftMinRating = widget.initialMinRating;
    _draftMinPrice = widget.initialMinPrice;
    _draftMaxPrice = widget.initialMaxPrice > 0 ? widget.initialMaxPrice : widget.maxProductPrice;
    if (_draftMaxPrice == 0) _draftMaxPrice = 5000000;
  }

  void _clearFilters() {
    setState(() {
      _draftBrands.clear();
      _draftMinRating = 0.0;
      _draftMinPrice = 0.0;
      _draftMaxPrice = widget.maxProductPrice > 0 ? widget.maxProductPrice : 5000000;
    });
  }

  void _applyFilters() {
    double maxP = _draftMaxPrice >= widget.maxProductPrice ? 0 : _draftMaxPrice;
    widget.onApply(_draftBrands, _draftMinRating, _draftMinPrice, maxP);
    Navigator.pop(context);
  }

  String _fmtPrice(double n) {
    return '${n.toInt()} ${widget.lang == 'ru' ? 'сум' : "so'm"}';
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Text(
        title,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isUz = widget.lang == 'uz';

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(
                  onPressed: _clearFilters,
                  child: Text(
                    isUz ? 'Tozalash' : 'Сбросить',
                    style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.bold),
                  ),
                ),
                Text(
                  isUz ? 'Filtrlar' : 'Фильтры',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Scrollable Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Price Section
                  _buildSectionTitle(isUz ? 'Narx' : 'Цена'),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(_fmtPrice(_draftMinPrice), style: const TextStyle(fontWeight: FontWeight.bold)),
                      const Text('—', style: TextStyle(color: Colors.grey)),
                      Text(_fmtPrice(_draftMaxPrice), style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 24),
                  RangeSlider(
                    values: RangeValues(_draftMinPrice, _draftMaxPrice),
                    min: 0,
                    max: widget.maxProductPrice > 0 ? widget.maxProductPrice : 5000000,
                    activeColor: AppTheme.primaryColor,
                    inactiveColor: Colors.grey.shade200,
                    onChanged: (RangeValues values) {
                      setState(() {
                        _draftMinPrice = values.start;
                        _draftMaxPrice = values.end;
                      });
                    },
                  ),

                  // Brands Section
                  if (widget.brands.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildSectionTitle(isUz ? 'Brendlar' : 'Бренды'),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: widget.brands.map((b) {
                        final isSelected = _draftBrands.contains(b.id);
                        return ChoiceChip(
                          label: Text(b.getLocalizedName(widget.lang)),
                          selected: isSelected,
                          selectedColor: AppTheme.primaryColor,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : AppTheme.textPrimaryColor,
                            fontWeight: FontWeight.bold,
                          ),
                          onSelected: (selected) {
                            setState(() {
                              if (selected) {
                                _draftBrands.add(b.id);
                              } else {
                                _draftBrands.remove(b.id);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                  ],

                  // Rating Section
                  const SizedBox(height: 16),
                  _buildSectionTitle(isUz ? 'Reyting' : 'Рейтинг'),
                  ...[4.5, 4.0, 3.5, 0.0].map((r) {
                    final isSelected = _draftMinRating == r;
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isSelected ? AppTheme.primaryColor : Colors.white,
                          border: Border.all(
                            color: isSelected ? AppTheme.primaryColor : Colors.grey.shade300,
                            width: 2,
                          ),
                        ),
                        child: isSelected
                            ? const Icon(Icons.check, size: 16, color: Colors.white)
                            : null,
                      ),
                      title: Text(
                        r == 0 ? (isUz ? 'Har qanday' : 'Любой') : '$r+ ⭐',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      onTap: () {
                        setState(() {
                          _draftMinRating = r;
                        });
                      },
                    );
                  }),
                ],
              ),
            ),
          ),

          // Bottom Action
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: ElevatedButton(
                onPressed: _applyFilters,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
                child: Text(
                  isUz ? 'Qo\'llash' : 'Применить',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class PromotionBanner {
  final String id;
  final String? htmlUz;
  final String? htmlRu;
  final String? titleUz;
  final String? titleRu;
  final String? tabNameUz;
  final String? tabNameRu;
  final double? order;

  PromotionBanner({
    required this.id,
    this.htmlUz,
    this.htmlRu,
    this.titleUz,
    this.titleRu,
    this.tabNameUz,
    this.tabNameRu,
    this.order,
  });

  factory PromotionBanner.fromJson(Map<String, dynamic> json) {
    return PromotionBanner(
      id: json['id']?.toString() ?? '',
      htmlUz: json['html_uz']?.toString() ?? json['htmlUz']?.toString(),
      htmlRu: json['html_ru']?.toString() ?? json['htmlRu']?.toString(),
      titleUz: json['title_uz']?.toString() ?? json['titleUz']?.toString(),
      titleRu: json['title_ru']?.toString() ?? json['titleRu']?.toString(),
      tabNameUz: json['tab_name_uz']?.toString() ?? json['tabName_uz']?.toString() ?? json['tabNameUz']?.toString(),
      tabNameRu: json['tab_name_ru']?.toString() ?? json['tabName_ru']?.toString() ?? json['tabNameRu']?.toString(),
      order: (json['order_index'] as num? ?? json['order'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'html_uz': htmlUz,
      'html_ru': htmlRu,
      'title_uz': titleUz,
      'title_ru': titleRu,
      'tabName_uz': tabNameUz,
      'tabName_ru': tabNameRu,
      'order': order,
    };
  }

  String? getLocalizedHtml(String lang) {
    if (lang == 'uz') return htmlUz;
    if (lang == 'ru') return htmlRu;
    return htmlUz;
  }

  String? getLocalizedTitle(String lang) {
    if (lang == 'uz') return titleUz;
    if (lang == 'ru') return titleRu;
    return titleUz;
  }

  String? getLocalizedTabName(String lang) {
    if (lang == 'uz') return tabNameUz;
    if (lang == 'ru') return tabNameRu;
    return tabNameUz;
  }
}

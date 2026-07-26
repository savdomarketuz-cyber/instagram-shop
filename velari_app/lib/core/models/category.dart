class Category {
  final String id;
  final String name;
  final String? nameUz;
  final String? nameRu;
  final String? parentId;
  final String? icon;
  final double? order;
  final Map<String, dynamic>? imageMeta;

  Category({
    required this.id,
    required this.name,
    this.nameUz,
    this.nameRu,
    this.parentId,
    this.icon,
    this.order,
    this.imageMeta,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      nameUz: json['name_uz']?.toString(),
      nameRu: json['name_ru']?.toString(),
      parentId: json['parentId']?.toString() ?? json['parent_id']?.toString(),
      icon: json['icon']?.toString(),
      order: (json['order'] as num?)?.toDouble(),
      imageMeta: json['image_meta'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'name_uz': nameUz,
      'name_ru': nameRu,
      'parentId': parentId,
      'icon': icon,
      'order': order,
      'image_meta': imageMeta,
    };
  }

  String getLocalizedName(String lang) {
    if (lang == 'uz') return nameUz ?? name;
    if (lang == 'ru') return nameRu ?? name;
    return name;
  }

  String? get imageUrl => icon ?? imageMeta?['url']?.toString();
  String? get image => imageUrl;
}

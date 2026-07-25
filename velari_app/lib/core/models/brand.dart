class Brand {
  final String id;
  final String name;
  final String? nameUz;
  final String? nameRu;

  Brand({
    required this.id,
    required this.name,
    this.nameUz,
    this.nameRu,
  });

  factory Brand.fromJson(Map<String, dynamic> json) {
    return Brand(
      id: json['id'].toString(),
      name: json['name']?.toString() ?? '',
      nameUz: json['name_uz']?.toString(),
      nameRu: json['name_ru']?.toString(),
    );
  }

  String getLocalizedName(String lang) {
    if (lang == 'uz' && nameUz != null && nameUz!.isNotEmpty) return nameUz!;
    if (lang == 'ru' && nameRu != null && nameRu!.isNotEmpty) return nameRu!;
    return name;
  }
}

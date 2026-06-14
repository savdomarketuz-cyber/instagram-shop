class Product {
  final String id;
  final String name;
  final String? nameUz;
  final String? nameRu;
  final double price;
  final double? oldPrice;
  final String image;
  final List<String>? images;
  final String category;
  final String? categoryUz;
  final String? categoryRu;
  final String? description;
  final String? descriptionUz;
  final String? descriptionRu;
  final double? rating;
  final int? reviewCount;
  final int sales;
  final String? tag;
  final List<String>? tags;
  final List<String>? features;
  final bool? isDeleted;
  final bool? expressDelivery;
  final bool? isOriginal;
  final Map<String, dynamic>? stockDetails;
  final int? stock;
  final String? groupId;
  final String? colorName;
  final String? sku;
  final String? article;
  final String? videoUrl;
  final String? model;
  final String? brandId;
  final Map<String, dynamic>? imageMetadata;
  final String? createdAt;
  final Map<String, dynamic>? aiPersona;

  Product({
    required this.id,
    required this.name,
    this.nameUz,
    this.nameRu,
    required this.price,
    this.oldPrice,
    required this.image,
    this.images,
    required this.category,
    this.categoryUz,
    this.categoryRu,
    this.description,
    this.descriptionUz,
    this.descriptionRu,
    this.rating,
    this.reviewCount,
    required this.sales,
    this.tag,
    this.tags,
    this.features,
    this.isDeleted,
    this.expressDelivery,
    this.isOriginal,
    this.stockDetails,
    this.stock,
    this.groupId,
    this.colorName,
    this.sku,
    this.article,
    this.videoUrl,
    this.model,
    this.brandId,
    this.imageMetadata,
    this.createdAt,
    this.aiPersona,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      nameUz: json['name_uz']?.toString(),
      nameRu: json['name_ru']?.toString(),
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      oldPrice: (json['old_price'] as num? ?? json['oldPrice'] as num?)?.toDouble(),
      image: json['image']?.toString() ?? json['imageUrl']?.toString() ?? '',
      images: json['images'] != null ? List<String>.from(json['images']) : null,
      category: json['category']?.toString() ?? json['category_id']?.toString() ?? '',
      categoryUz: json['category_uz']?.toString(),
      categoryRu: json['category_ru']?.toString(),
      description: json['description']?.toString(),
      descriptionUz: json['description_uz']?.toString(),
      descriptionRu: json['description_ru']?.toString(),
      rating: (json['rating'] as num? ?? json['avg_rating'] as num?)?.toDouble(),
      reviewCount: (json['review_count'] as num? ?? json['reviewCount'] as num?)?.toInt(),
      sales: (json['sales'] as num?)?.toInt() ?? 0,
      tag: json['tag']?.toString(),
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      features: json['features'] != null ? List<String>.from(json['features']) : null,
      isDeleted: json['is_deleted'] as bool? ?? json['isDeleted'] as bool?,
      expressDelivery: json['express_delivery'] as bool? ?? json['expressDelivery'] as bool?,
      isOriginal: json['is_original'] as bool? ?? json['isOriginal'] as bool?,
      stockDetails: (json['stock_details'] ?? json['stockDetails']) is Map
          ? Map<String, dynamic>.from((json['stock_details'] ?? json['stockDetails']) as Map)
          : null,
      stock: (json['stock'] as num?)?.toInt(),
      groupId: json['groupId']?.toString() ?? json['group_id']?.toString(),
      colorName: json['colorName']?.toString() ?? json['color_name']?.toString(),
      sku: json['sku']?.toString(),
      article: json['article']?.toString(),
      videoUrl: json['videoUrl']?.toString() ?? json['video_url']?.toString(),
      model: json['model']?.toString(),
      brandId: json['brand_id']?.toString() ?? json['brandId']?.toString(),
      imageMetadata: json['image_metadata'] is Map
          ? Map<String, dynamic>.from(json['image_metadata'] as Map)
          : null,
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString(),
      aiPersona: json['ai_persona'] is Map<String, dynamic> ? json['ai_persona'] as Map<String, dynamic> : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'name_uz': nameUz,
      'name_ru': nameRu,
      'price': price,
      'oldPrice': oldPrice,
      'image': image,
      'images': images,
      'category': category,
      'category_uz': categoryUz,
      'category_ru': categoryRu,
      'description': description,
      'description_uz': descriptionUz,
      'description_ru': descriptionRu,
      'rating': rating,
      'reviewCount': reviewCount,
      'sales': sales,
      'tag': tag,
      'tags': tags,
      'features': features,
      'isDeleted': isDeleted,
      'express_delivery': expressDelivery,
      'isOriginal': isOriginal,
      'stockDetails': stockDetails,
      'stock': stock,
      'groupId': groupId,
      'colorName': colorName,
      'sku': sku,
      'article': article,
      'videoUrl': videoUrl,
      'model': model,
      'brand_id': brandId,
      'image_metadata': imageMetadata,
      'created_at': createdAt,
      'ai_persona': aiPersona,
    };
  }

  String getLocalizedName(String lang) {
    if (lang == 'uz') return nameUz ?? name;
    if (lang == 'ru') return nameRu ?? name;
    return name;
  }

  String getLocalizedCategory(String lang) {
    if (lang == 'uz') return categoryUz ?? category;
    if (lang == 'ru') return categoryRu ?? category;
    return category;
  }

  String? getLocalizedDescription(String lang) {
    if (lang == 'uz') return descriptionUz ?? description;
    if (lang == 'ru') return descriptionRu ?? description;
    return description;
  }

  int get calculatedStock {
    if (stockDetails == null) return stock ?? 0;
    return stockDetails!.values.fold(0, (sum, val) => sum + (int.tryParse(val.toString()) ?? 0));
  }
}

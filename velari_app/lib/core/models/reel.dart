class Reel {
  final String id;
  final String videoUrl;
  final String? thumbnailUrl;
  final String? productId;
  final String? productName;
  final double? productPrice;
  final String? description;
  final int likes;
  final int views;

  Reel({
    required this.id,
    required this.videoUrl,
    this.thumbnailUrl,
    this.productId,
    this.productName,
    this.productPrice,
    this.description,
    this.likes = 0,
    this.views = 0,
  });

  factory Reel.fromJson(Map<String, dynamic> json) {
    return Reel(
      id: json['id']?.toString() ?? '',
      videoUrl: json['videoUrl']?.toString() ?? json['video_url']?.toString() ?? '',
      thumbnailUrl: json['thumbnailUrl']?.toString() ?? json['thumbnail_url']?.toString(),
      productId: json['productId']?.toString() ?? json['product_id']?.toString(),
      productName: json['productName']?.toString() ?? json['product_name']?.toString(),
      productPrice: (json['productPrice'] as num?)?.toDouble() ?? (json['product_price'] as num?)?.toDouble(),
      description: json['description']?.toString(),
      likes: (json['likes'] as num?)?.toInt() ?? 0,
      views: (json['views'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'videoUrl': videoUrl,
      'thumbnailUrl': thumbnailUrl,
      'productId': productId,
      'productName': productName,
      'productPrice': productPrice,
      'description': description,
      'likes': likes,
      'views': views,
    };
  }
}

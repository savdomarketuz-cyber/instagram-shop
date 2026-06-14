class Comment {
  final String id;
  final String? productId;
  final String? reelId;
  final String userPhone;
  final String? userName;
  final String text;
  final double? rating;
  final String? parentId;
  final String createdAt;
  final List<Comment>? replies;

  Comment({
    required this.id,
    this.productId,
    this.reelId,
    required this.userPhone,
    this.userName,
    required this.text,
    this.rating,
    this.parentId,
    required this.createdAt,
    this.replies,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id']?.toString() ?? '',
      productId: json['product_id']?.toString() ?? json['productId']?.toString(),
      reelId: json['reel_id']?.toString() ?? json['reelId']?.toString(),
      userPhone: json['user_phone']?.toString() ?? json['userPhone']?.toString() ?? '',
      userName: json['user_name']?.toString() ?? json['userName']?.toString() ?? 'Mehmon',
      text: json['text']?.toString() ?? '',
      rating: (json['rating'] as num?)?.toDouble(),
      parentId: json['parent_id']?.toString() ?? json['parentId']?.toString(),
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString() ?? '',
      replies: json['replies'] != null
          ? List<Comment>.from((json['replies'] as List).map((x) => Comment.fromJson(x as Map<String, dynamic>)))
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'product_id': productId,
      'reel_id': reelId,
      'user_phone': userPhone,
      'user_name': userName,
      'text': text,
      'rating': rating,
      'parent_id': parentId,
      'created_at': createdAt,
      'replies': replies?.map((x) => x.toJson()).toList(),
    };
  }
}

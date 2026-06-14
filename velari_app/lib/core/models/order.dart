class Order {
  final String id;
  final String userPhone;
  final List<OrderItem> items;
  final double total;
  final String? address;
  final List<double>? coords;
  final String status;
  final String? createdAt;

  Order({
    required this.id,
    required this.userPhone,
    required this.items,
    required this.total,
    this.address,
    this.coords,
    required this.status,
    this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id']?.toString() ?? '',
      userPhone: json['userPhone']?.toString() ?? json['user_phone']?.toString() ?? '',
      items: json['items'] != null
          ? List<OrderItem>.from((json['items'] as List).map((x) => OrderItem.fromJson(x as Map<String, dynamic>)))
          : [],
      total: (json['total'] as num?)?.toDouble() ?? 0.0,
      address: json['address']?.toString(),
      coords: json['coords'] != null ? List<double>.from((json['coords'] as List).map((x) => (x as num).toDouble())) : null,
      status: json['status']?.toString() ?? 'pending',
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userPhone': userPhone,
      'items': items.map((x) => x.toJson()).toList(),
      'total': total,
      'address': address,
      'coords': coords,
      'status': status,
      'created_at': createdAt,
    };
  }
}

class OrderItem {
  final String id;
  final String name;
  final double price;
  final int quantity;
  final String? image;

  OrderItem({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    this.image,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      image: json['image']?.toString() ?? json['imageUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'quantity': quantity,
      'image': image,
    };
  }
}

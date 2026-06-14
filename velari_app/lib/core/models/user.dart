class User {
  final String id;
  final String phone;
  final String name;
  final String username;
  final bool isAdmin;

  User({
    required this.id,
    required this.phone,
    required this.name,
    required this.username,
    required this.isAdmin,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Mijoz',
      username: json['username']?.toString() ?? '',
      isAdmin: json['isAdmin'] as bool? ?? json['is_admin'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'name': name,
      'username': username,
      'isAdmin': isAdmin,
    };
  }
}

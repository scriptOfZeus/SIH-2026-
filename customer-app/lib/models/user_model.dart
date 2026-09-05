class UserModel {
  final String id;
  final String phone;
  final String? fullName;
  final String? defaultAddress;
  final double? defaultLat;
  final double? defaultLng;
  final String role;

  UserModel({
    required this.id,
    required this.phone,
    this.fullName,
    this.defaultAddress,
    this.defaultLat,
    this.defaultLng,
    this.role = 'customer',
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      phone: json['phone'] ?? '',
      fullName: json['full_name'],
      defaultAddress: json['default_address'],
      defaultLat: json['default_lat'] != null ? (json['default_lat'] as num).toDouble() : null,
      defaultLng: json['default_lng'] != null ? (json['default_lng'] as num).toDouble() : null,
      role: json['role'] ?? 'customer',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'full_name': fullName,
      'default_address': defaultAddress,
      'default_lat': defaultLat,
      'default_lng': defaultLng,
      'role': role,
    };
  }

  UserModel copyWith({
    String? id,
    String? phone,
    String? fullName,
    String? defaultAddress,
    double? defaultLat,
    double? defaultLng,
    String? role,
  }) {
    return UserModel(
      id: id ?? this.id,
      phone: phone ?? this.phone,
      fullName: fullName ?? this.fullName,
      defaultAddress: defaultAddress ?? this.defaultAddress,
      defaultLat: defaultLat ?? this.defaultLat,
      defaultLng: defaultLng ?? this.defaultLng,
      role: role ?? this.role,
    );
  }
}

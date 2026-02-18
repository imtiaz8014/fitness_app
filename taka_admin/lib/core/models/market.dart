import 'package:cloud_firestore/cloud_firestore.dart';

class Market {
  final String id;
  final String title;
  final String description;
  final String category;
  final String? imageUrl;
  final String status; // open, closed, resolved, cancelled
  final String? resolution; // yes, no, null
  final String createdBy;
  final double totalYesAmount;
  final double totalNoAmount;
  final double totalVolume;
  final DateTime? deadline;
  final DateTime? resolvedAt;
  final DateTime? createdAt;
  final String? groupId;
  final String? groupTitle;

  Market({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    this.imageUrl,
    required this.status,
    this.resolution,
    required this.createdBy,
    required this.totalYesAmount,
    required this.totalNoAmount,
    required this.totalVolume,
    this.deadline,
    this.resolvedAt,
    this.createdAt,
    this.groupId,
    this.groupTitle,
  });

  factory Market.fromMap(String id, Map<String, dynamic> map) {
    return Market(
      id: id,
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      category: map['category'] ?? 'other',
      imageUrl: map['imageUrl'],
      status: map['status'] ?? 'open',
      resolution: map['resolution'],
      createdBy: map['createdBy'] ?? '',
      totalYesAmount: (map['totalYesAmount'] ?? 0).toDouble(),
      totalNoAmount: (map['totalNoAmount'] ?? 0).toDouble(),
      totalVolume: (map['totalVolume'] ?? 0).toDouble(),
      deadline: (map['deadline'] as Timestamp?)?.toDate(),
      resolvedAt: (map['resolvedAt'] as Timestamp?)?.toDate(),
      createdAt: (map['createdAt'] as Timestamp?)?.toDate(),
      groupId: map['groupId'] as String?,
      groupTitle: map['groupTitle'] as String?,
    );
  }
}

import 'package:cloud_firestore/cloud_firestore.dart';

class RunRecord {
  final String id;
  final double distance;
  final int duration;
  final double pace;
  final double tkEarned;
  final String status;
  final DateTime? createdAt;

  RunRecord({
    required this.id,
    required this.distance,
    required this.duration,
    required this.pace,
    required this.tkEarned,
    required this.status,
    this.createdAt,
  });

  factory RunRecord.fromMap(String id, Map<String, dynamic> map) {
    return RunRecord(
      id: id,
      distance: (map['distance'] ?? 0).toDouble(),
      duration: (map['duration'] ?? 0).toInt(),
      pace: (map['pace'] ?? 0).toDouble(),
      tkEarned: (map['tkEarned'] ?? 0).toDouble(),
      status: map['status'] ?? 'pending',
      createdAt: (map['createdAt'] as Timestamp?)?.toDate(),
    );
  }
}

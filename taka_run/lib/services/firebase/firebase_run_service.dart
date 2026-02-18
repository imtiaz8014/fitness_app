import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../../services/location/location_service.dart';

class RunResult {
  final String runId;
  final bool validated;
  final double tkEarned;
  final List<String> errors;

  RunResult({
    required this.runId,
    required this.validated,
    required this.tkEarned,
    required this.errors,
  });

  factory RunResult.fromMap(Map<String, dynamic> map) {
    return RunResult(
      runId: map['runId'] ?? '',
      validated: map['validated'] ?? false,
      tkEarned: (map['tkEarned'] ?? 0).toDouble(),
      errors: List<String>.from(map['errors'] ?? []),
    );
  }
}

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

class FirebaseRunService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<RunResult> submitRun({
    required List<GpsPoint> gpsPoints,
    required double distance,
    required int duration,
    required int startTime,
    required int endTime,
  }) async {
    final user = _auth.currentUser;
    debugPrint('[FirebaseRunService] submitRun called');
    debugPrint('[FirebaseRunService] currentUser: ${user?.uid ?? "NULL"}');
    debugPrint('[FirebaseRunService] isAnonymous: ${user?.isAnonymous}');
    debugPrint('[FirebaseRunService] email: ${user?.email}');
    if (user == null) throw Exception('Not authenticated');

    // Verify token is fresh
    final token = await user.getIdToken(true);
    debugPrint('[FirebaseRunService] idToken length: ${token?.length ?? 0}');

    final result = await _functions.httpsCallable('submitRun').call({
      'gpsPoints': gpsPoints.map((p) => p.toJson()).toList(),
      'distance': distance,
      'duration': duration,
      'startTime': startTime,
      'endTime': endTime,
    });

    return RunResult.fromMap(Map<String, dynamic>.from(result.data));
  }

  Future<List<RunRecord>> getRuns({int limit = 20, String? startAfter}) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw Exception('Not authenticated');

    Query query = _firestore
        .collection('runs')
        .where('userId', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .limit(limit);

    if (startAfter != null) {
      final startDoc = await _firestore.collection('runs').doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfterDocument(startDoc);
      }
    }

    final snapshot = await query.get();
    return snapshot.docs
        .map((doc) => RunRecord.fromMap(doc.id, doc.data() as Map<String, dynamic>))
        .toList();
  }
}

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../../core/models/gps_point.dart';
import '../../core/models/run_result.dart';
import '../../core/models/run_record.dart';

export '../../core/models/gps_point.dart';
export '../../core/models/run_result.dart';
export '../../core/models/run_record.dart';

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

import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/models/user_profile.dart';

export '../../core/models/user_profile.dart';

class FirebaseUserService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  User? get currentUser => _auth.currentUser;

  Stream<UserProfile?> getUserStream() {
    final user = _auth.currentUser;
    if (user == null) return Stream.value(null);

    return _firestore
        .collection('users')
        .doc(user.uid)
        .snapshots()
        .map((doc) {
      if (!doc.exists) return null;
      return UserProfile.fromMap(doc.id, doc.data()!);
    });
  }

  Future<UserProfile?> getUserProfile() async {
    final user = _auth.currentUser;
    if (user == null) return null;

    final doc = await _firestore.collection('users').doc(user.uid).get();
    if (!doc.exists) return null;
    return UserProfile.fromMap(doc.id, doc.data()!);
  }

  Future<Map<String, dynamic>> refreshBalance() async {
    final result = await _functions.httpsCallable('getBalance').call();
    return Map<String, dynamic>.from(result.data);
  }
}

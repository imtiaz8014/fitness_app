import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import '../../../../core/models/market.dart';
import '../../domain/repositories/market_repository.dart';

class MarketRepositoryImpl implements MarketRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  static const _functionsBaseUrl =
      'https://us-central1-taka-wallet-app.cloudfunctions.net';

  /// Call a Cloud Function via HTTP with manual auth token.
  /// Workaround for GMS DEVELOPER_ERROR on some devices.
  Future<Map<String, dynamic>> _callFunction(
      String name, Map<String, dynamic> data) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) throw Exception('Not authenticated');
    final token = await user.getIdToken();

    final response = await http.post(
      Uri.parse('$_functionsBaseUrl/$name'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'data': data}),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      final error = body['error'] ?? body;
      throw Exception(error['message'] ?? 'Function call failed');
    }

    final body = jsonDecode(response.body);
    return body['result'] as Map<String, dynamic>;
  }

  @override
  Stream<List<Market>> getMarketsStream() {
    return _firestore
        .collection('markets')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => Market.fromMap(doc.id, doc.data()))
            .toList());
  }

  @override
  Future<bool> isAdmin(String userId) async {
    try {
      final doc = await _firestore.collection('users').doc(userId).get();
      return doc.exists && doc.data()?['role'] == 'admin';
    } catch (_) {
      return false;
    }
  }

  @override
  Future<String> createMarket({
    required String title,
    required String description,
    required String category,
    required String deadline,
  }) async {
    final result = await _callFunction('createMarket', {
      'title': title,
      'description': description,
      'category': category,
      'deadline': deadline,
    });
    return result['marketId'] as String;
  }

  @override
  Future<void> resolveMarket(String marketId, bool outcome) async {
    await _callFunction('resolveMarket', {
      'marketId': marketId,
      'outcome': outcome,
    });
  }

  @override
  Future<void> cancelMarket(String marketId) async {
    await _callFunction('cancelMarket', {
      'marketId': marketId,
    });
  }

  @override
  Future<Map<String, dynamic>> createMarketGroup({
    required String groupTitle,
    required String description,
    required String category,
    required List<Map<String, String>> markets,
  }) async {
    return _callFunction('createMarketGroup', {
      'groupTitle': groupTitle,
      'description': description,
      'category': category,
      'markets': markets,
    });
  }
}

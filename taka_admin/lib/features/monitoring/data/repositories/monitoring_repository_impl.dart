import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import '../../domain/models/treasury_status.dart';
import '../../domain/repositories/monitoring_repository.dart';

class MonitoringRepositoryImpl implements MonitoringRepository {
  static const _functionsBaseUrl =
      'https://us-central1-taka-wallet-app.cloudfunctions.net';

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
  Future<TreasuryStatus> getTreasuryStatus() async {
    final result = await _callFunction('getTreasuryStatus', {});
    return TreasuryStatus.fromMap(result);
  }
}

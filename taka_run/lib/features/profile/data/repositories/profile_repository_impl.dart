import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/models/user_profile.dart';
import '../../../../services/firebase/firebase_user_service.dart';
import '../../domain/repositories/profile_repository.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  final FirebaseUserService userService;
  final SharedPreferences prefs;

  static const String _useMetricKey = 'use_metric';

  ProfileRepositoryImpl({
    required this.userService,
    required this.prefs,
  });

  @override
  Future<UserProfile?> getUserProfile() => userService.getUserProfile();

  @override
  Stream<UserProfile?> getUserStream() => userService.getUserStream();

  @override
  Future<void> refreshBalance() => userService.refreshBalance();

  @override
  Future<bool> getUseMetric() async {
    return prefs.getBool(_useMetricKey) ?? true;
  }

  @override
  Future<void> setUseMetric(bool useMetric) async {
    await prefs.setBool(_useMetricKey, useMetric);
  }
}

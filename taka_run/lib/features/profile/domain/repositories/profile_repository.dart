import '../../../../services/firebase/firebase_user_service.dart';

abstract class ProfileRepository {
  Future<UserProfile?> getUserProfile();
  Stream<UserProfile?> getUserStream();
  Future<void> refreshBalance();
  Future<bool> getUseMetric();
  Future<void> setUseMetric(bool useMetric);
}

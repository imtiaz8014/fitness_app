import '../../../../core/models/user_profile.dart';

abstract class HomeRepository {
  Stream<UserProfile?> getUserStream();
  Future<UserProfile?> getUserProfile();
  Future<void> refreshBalance();
}

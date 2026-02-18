import '../../../../services/firebase/firebase_user_service.dart';

abstract class HomeRepository {
  Stream<UserProfile?> getUserStream();
  Future<UserProfile?> getUserProfile();
  Future<void> refreshBalance();
}

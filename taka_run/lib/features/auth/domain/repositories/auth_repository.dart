abstract class AuthRepository {
  Future<bool> isLoggedIn();
  Future<void> signInWithGoogle();
  Future<void> signOut();
  String? getCurrentUserId();
}

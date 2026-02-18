abstract class AuthRepository {
  Future<bool> isLoggedIn();
  Future<void> signInWithEmail(String email, String password);
  Future<void> signInWithGoogle();
  Future<void> signOut();
  String? getCurrentUserId();
  String? getCurrentUserEmail();
}

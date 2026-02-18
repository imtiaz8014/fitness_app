import '../../../../services/firebase/firebase_user_service.dart';
import '../../domain/repositories/home_repository.dart';

class HomeRepositoryImpl implements HomeRepository {
  final FirebaseUserService userService;

  HomeRepositoryImpl({required this.userService});

  @override
  Stream<UserProfile?> getUserStream() => userService.getUserStream();

  @override
  Future<UserProfile?> getUserProfile() => userService.getUserProfile();

  @override
  Future<void> refreshBalance() => userService.refreshBalance();
}

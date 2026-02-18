import '../../../../services/firebase/firebase_run_service.dart';
import '../../../../services/firebase/firebase_user_service.dart';

abstract class StatsRepository {
  Future<List<RunRecord>> getAllRuns();
  Future<UserProfile?> getUserProfile();
}

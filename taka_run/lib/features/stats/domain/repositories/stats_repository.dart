import '../../../../core/models/run_record.dart';
import '../../../../core/models/user_profile.dart';

abstract class StatsRepository {
  Future<List<RunRecord>> getAllRuns();
  Future<UserProfile?> getUserProfile();
}

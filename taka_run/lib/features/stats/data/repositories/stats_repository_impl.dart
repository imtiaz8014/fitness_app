import '../../../../core/models/run_record.dart';
import '../../../../core/models/user_profile.dart';
import '../../../../services/firebase/firebase_run_service.dart';
import '../../../../services/firebase/firebase_user_service.dart';
import '../../domain/repositories/stats_repository.dart';

class StatsRepositoryImpl implements StatsRepository {
  final FirebaseRunService runService;
  final FirebaseUserService userService;

  StatsRepositoryImpl({
    required this.runService,
    required this.userService,
  });

  @override
  Future<List<RunRecord>> getAllRuns() async {
    // Fetch runs in batches to get all available data
    const maxRuns = 500;
    final List<RunRecord> allRuns = [];
    String? cursor;
    bool hasMore = true;

    while (hasMore && allRuns.length < maxRuns) {
      final batch = await runService.getRuns(limit: 100, startAfter: cursor);
      allRuns.addAll(batch);
      if (batch.length < 100) {
        hasMore = false;
      } else {
        cursor = batch.last.id;
      }
    }

    return allRuns;
  }

  @override
  Future<UserProfile?> getUserProfile() {
    return userService.getUserProfile();
  }
}

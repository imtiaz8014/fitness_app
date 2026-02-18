import '../../../../core/models/run_record.dart';
import '../../../../services/firebase/firebase_run_service.dart';
import '../../domain/repositories/history_repository.dart';

class HistoryRepositoryImpl implements HistoryRepository {
  final FirebaseRunService runService;

  HistoryRepositoryImpl({required this.runService});

  @override
  Future<List<RunRecord>> getRuns({int limit = 20, String? startAfter}) {
    return runService.getRuns(limit: limit, startAfter: startAfter);
  }
}

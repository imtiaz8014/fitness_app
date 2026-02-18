import '../../../../services/firebase/firebase_run_service.dart';

abstract class HistoryRepository {
  Future<List<RunRecord>> getRuns({int limit, String? startAfter});
}

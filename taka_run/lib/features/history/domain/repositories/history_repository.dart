import '../../../../core/models/run_record.dart';

abstract class HistoryRepository {
  Future<List<RunRecord>> getRuns({int limit, String? startAfter});
}

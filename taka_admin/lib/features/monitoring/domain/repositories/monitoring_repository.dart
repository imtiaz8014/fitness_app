import '../models/treasury_status.dart';

abstract class MonitoringRepository {
  Future<TreasuryStatus> getTreasuryStatus();
}

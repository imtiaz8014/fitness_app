import '../../../../services/location/location_service.dart';
import '../../../../services/firebase/firebase_run_service.dart';

abstract class RunRepository {
  Future<bool> checkLocationPermission();
  Stream<GpsPoint> get locationStream;
  Future<void> startTracking();
  void stopTracking();
  Future<RunResult> submitRun({
    required List<GpsPoint> gpsPoints,
    required double distance,
    required int duration,
    required int startTime,
    required int endTime,
  });
}

import '../../../../services/location/location_service.dart';
import '../../../../services/firebase/firebase_run_service.dart';
import '../../domain/repositories/run_repository.dart';

class RunRepositoryImpl implements RunRepository {
  final LocationService locationService;
  final FirebaseRunService runService;

  RunRepositoryImpl({required this.locationService, required this.runService});

  @override
  Future<bool> checkLocationPermission() => locationService.checkPermission();

  @override
  Stream<GpsPoint> get locationStream => locationService.positionStream;

  @override
  Future<void> startTracking() => locationService.startTracking();

  @override
  void stopTracking() => locationService.stopTracking();

  @override
  Future<RunResult> submitRun({
    required List<GpsPoint> gpsPoints,
    required double distance,
    required int duration,
    required int startTime,
    required int endTime,
  }) {
    return runService.submitRun(
      gpsPoints: gpsPoints,
      distance: distance,
      duration: duration,
      startTime: startTime,
      endTime: endTime,
    );
  }
}

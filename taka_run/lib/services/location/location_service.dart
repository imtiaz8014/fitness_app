import 'dart:async';
import 'package:geolocator/geolocator.dart';
import '../../core/models/gps_point.dart';

export '../../core/models/gps_point.dart';

class LocationService {
  StreamSubscription<Position>? _positionSubscription;
  final _pointsController = StreamController<GpsPoint>.broadcast();
  bool _isTracking = false;

  Stream<GpsPoint> get positionStream => _pointsController.stream;

  Future<bool> checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }
    if (permission == LocationPermission.deniedForever) return false;
    return true;
  }

  Future<void> startTracking() async {
    if (_isTracking) return;
    _isTracking = true;

    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5,
    );

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      (Position position) {
        _pointsController.add(GpsPoint(
          lat: position.latitude,
          lng: position.longitude,
          timestamp: position.timestamp.millisecondsSinceEpoch,
          accuracy: position.accuracy,
          altitude: position.altitude,
          speed: position.speed,
        ));
      },
      onError: (error) {
        _pointsController.addError(error);
      },
    );
  }

  void stopTracking() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
    _isTracking = false;
  }

  void dispose() {
    stopTracking();
    _pointsController.close();
  }
}

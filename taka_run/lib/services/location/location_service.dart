import 'dart:async';
import 'package:geolocator/geolocator.dart';

class GpsPoint {
  final double lat;
  final double lng;
  final int timestamp;
  final double accuracy;
  final double altitude;
  final double speed;

  GpsPoint({
    required this.lat,
    required this.lng,
    required this.timestamp,
    required this.accuracy,
    required this.altitude,
    required this.speed,
  });

  Map<String, dynamic> toJson() => {
    'lat': lat,
    'lng': lng,
    'timestamp': timestamp,
    'accuracy': accuracy,
    'altitude': altitude,
    'speed': speed,
  };
}

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

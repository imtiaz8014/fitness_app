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

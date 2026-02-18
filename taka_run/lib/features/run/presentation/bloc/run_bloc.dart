import 'dart:async';
import 'dart:math';
import 'package:equatable/equatable.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../services/location/location_service.dart';
import '../../../../services/firebase/firebase_run_service.dart';
import '../../domain/repositories/run_repository.dart';

// Events
abstract class RunEvent extends Equatable {
  @override
  List<Object?> get props => [];
}
class StartRun extends RunEvent {}
class StopRun extends RunEvent {}
class PauseRun extends RunEvent {}
class ResumeRun extends RunEvent {}
class DiscardRun extends RunEvent {}
class SubmitRun extends RunEvent {}
class SimulateRun extends RunEvent {}
class _GpsPointReceived extends RunEvent {
  final GpsPoint point;
  _GpsPointReceived(this.point);
  @override
  List<Object?> get props => [point];
}
class _TimerTick extends RunEvent {}

// States
abstract class RunState extends Equatable {
  @override
  List<Object?> get props => [];
}
class RunIdle extends RunState {}
class RunPermissionNeeded extends RunState {}

class RunActive extends RunState {
  final double distance; // km
  final int duration; // seconds
  final double pace; // min/km
  final List<GpsPoint> gpsPoints;
  final bool isPaused;

  RunActive({
    required this.distance,
    required this.duration,
    required this.pace,
    required this.gpsPoints,
    this.isPaused = false,
  });

  RunActive copyWith({
    double? distance,
    int? duration,
    double? pace,
    List<GpsPoint>? gpsPoints,
    bool? isPaused,
  }) {
    return RunActive(
      distance: distance ?? this.distance,
      duration: duration ?? this.duration,
      pace: pace ?? this.pace,
      gpsPoints: gpsPoints ?? this.gpsPoints,
      isPaused: isPaused ?? this.isPaused,
    );
  }

  @override
  List<Object?> get props => [distance, duration, pace, gpsPoints, isPaused];
}

class RunSummary extends RunState {
  final double distance;
  final int duration;
  final double pace;
  final List<GpsPoint> gpsPoints;

  RunSummary({
    required this.distance,
    required this.duration,
    required this.pace,
    required this.gpsPoints,
  });

  @override
  List<Object?> get props => [distance, duration, pace, gpsPoints];
}

class RunSubmitting extends RunState {}

class RunCompleted extends RunState {
  final RunResult result;
  RunCompleted(this.result);
  @override
  List<Object?> get props => [result];
}

class RunError extends RunState {
  final String message;
  RunError(this.message);
  @override
  List<Object?> get props => [message];
}

class RunBloc extends Bloc<RunEvent, RunState> {
  final RunRepository runRepository;

  StreamSubscription<GpsPoint>? _locationSub;
  Timer? _timer;
  int _startTime = 0;
  int _elapsedSeconds = 0;
  double _totalDistance = 0;
  final List<GpsPoint> _gpsPoints = [];
  GpsPoint? _lastPoint;

  RunBloc({required this.runRepository}) : super(RunIdle()) {
    on<StartRun>(_onStart);
    on<StopRun>(_onStop);
    on<PauseRun>(_onPause);
    on<ResumeRun>(_onResume);
    on<DiscardRun>(_onDiscard);
    on<SubmitRun>(_onSubmit);
    on<_GpsPointReceived>(_onGpsPoint);
    on<_TimerTick>(_onTimerTick);
    on<SimulateRun>(_onSimulateRun);
  }

  double _haversine(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371000.0;
    final dLat = (lat2 - lat1) * pi / 180;
    final dLon = (lon2 - lon1) * pi / 180;
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180) * cos(lat2 * pi / 180) *
        sin(dLon / 2) * sin(dLon / 2);
    return R * 2 * atan2(sqrt(a), sqrt(1 - a));
  }

  RunActive _buildActiveState({bool? isPaused}) {
    final distKm = _totalDistance / 1000;
    final pace = distKm > 0 ? (_elapsedSeconds / 60) / distKm : 0.0;
    return RunActive(
      distance: distKm,
      duration: _elapsedSeconds,
      pace: pace,
      gpsPoints: List.from(_gpsPoints),
      isPaused: isPaused ?? false,
    );
  }

  Future<void> _onStart(StartRun event, Emitter<RunState> emit) async {
    final hasPermission = await runRepository.checkLocationPermission();
    if (!hasPermission) {
      emit(RunPermissionNeeded());
      return;
    }

    _gpsPoints.clear();
    _totalDistance = 0;
    _elapsedSeconds = 0;
    _lastPoint = null;
    _startTime = DateTime.now().millisecondsSinceEpoch;

    await runRepository.startTracking();

    _locationSub = runRepository.locationStream.listen((point) {
      add(_GpsPointReceived(point));
    });

    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      add(_TimerTick());
    });

    emit(_buildActiveState());
  }

  void _onGpsPoint(_GpsPointReceived event, Emitter<RunState> emit) {
    final point = event.point;
    // Ignore GPS points with poor accuracy (> 20m)
    if (point.accuracy > 20) return;

    if (_lastPoint != null) {
      final dist = _haversine(
        _lastPoint!.lat, _lastPoint!.lng,
        point.lat, point.lng,
      );
      _totalDistance += dist;
    }
    _lastPoint = point;
    _gpsPoints.add(point);
    emit(_buildActiveState());
  }

  void _onTimerTick(_TimerTick event, Emitter<RunState> emit) {
    _elapsedSeconds++;
    final current = state;
    final isPaused = current is RunActive ? current.isPaused : false;
    emit(_buildActiveState(isPaused: isPaused));
  }

  void _onStop(StopRun event, Emitter<RunState> emit) {
    _timer?.cancel();
    _locationSub?.cancel();
    runRepository.stopTracking();

    final distKm = _totalDistance / 1000;
    final pace = distKm > 0 ? (_elapsedSeconds / 60) / distKm : 0.0;
    emit(RunSummary(
      distance: distKm,
      duration: _elapsedSeconds,
      pace: pace,
      gpsPoints: List.from(_gpsPoints),
    ));
  }

  void _onPause(PauseRun event, Emitter<RunState> emit) {
    _timer?.cancel();
    _locationSub?.pause();
    emit(_buildActiveState(isPaused: true));
  }

  void _onResume(ResumeRun event, Emitter<RunState> emit) {
    _locationSub?.resume();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      add(_TimerTick());
    });
    emit(_buildActiveState(isPaused: false));
  }

  void _onDiscard(DiscardRun event, Emitter<RunState> emit) {
    _cleanup();
    emit(RunIdle());
  }

  Future<void> _onSubmit(SubmitRun event, Emitter<RunState> emit) async {
    emit(RunSubmitting());
    try {
      final endTime = DateTime.now().millisecondsSinceEpoch;
      final result = await runRepository.submitRun(
        gpsPoints: _gpsPoints,
        distance: _totalDistance / 1000,
        duration: _elapsedSeconds,
        startTime: _startTime,
        endTime: endTime,
      );
      emit(RunCompleted(result));
    } catch (e, st) {
      debugPrint('[RunBloc] submitRun error: $e');
      debugPrint('[RunBloc] error type: ${e.runtimeType}');
      if (e is FirebaseException) {
        debugPrint('[RunBloc] FirebaseException code: ${e.code}, message: ${e.message}, plugin: ${e.plugin}');
      }
      debugPrint('[RunBloc] stackTrace: $st');
      emit(RunError(_mapRunError(e)));
    }
  }

  Future<void> _onSimulateRun(SimulateRun event, Emitter<RunState> emit) async {
    emit(RunSubmitting());
    try {
      // Generate fake GPS points for a ~1km run (about 6 min pace)
      final now = DateTime.now().millisecondsSinceEpoch;
      final startTime = now - 360000; // 6 minutes ago
      final baseLatLng = [23.8103, 90.4125]; // Dhaka area
      final fakeGpsPoints = <GpsPoint>[];
      const totalPoints = 72; // ~1 point per 5 seconds for 6 min
      for (int i = 0; i < totalPoints; i++) {
        fakeGpsPoints.add(GpsPoint(
          lat: baseLatLng[0] + (i * 0.00012),
          lng: baseLatLng[1] + (i * 0.00005),
          accuracy: 5.0,
          altitude: 10.0,
          speed: 2.8,
          timestamp: startTime + (i * 5000),
        ));
      }

      final result = await runRepository.submitRun(
        gpsPoints: fakeGpsPoints,
        distance: 1.0,
        duration: 360,
        startTime: startTime,
        endTime: now,
      );
      emit(RunCompleted(result));
    } catch (e, st) {
      debugPrint('[RunBloc] simulateRun error: $e');
      debugPrint('[RunBloc] error type: ${e.runtimeType}');
      if (e is FirebaseException) {
        debugPrint('[RunBloc] FirebaseException code: ${e.code}, message: ${e.message}, plugin: ${e.plugin}');
      }
      debugPrint('[RunBloc] stackTrace: $st');
      emit(RunError(_mapRunError(e)));
    }
  }

  String _mapRunError(Object e) {
    if (e is FirebaseException) {
      switch (e.code) {
        case 'not-found':
          return 'Run service unavailable. Please try again.';
        case 'permission-denied':
          return 'You do not have permission to submit runs.';
        case 'unauthenticated':
          return 'Please sign in to submit your run.';
        default:
          return 'Failed to submit run. Please try again.';
      }
    }
    return 'Something went wrong. Please try again.';
  }

  void _cleanup() {
    _timer?.cancel();
    _locationSub?.cancel();
    runRepository.stopTracking();
    _gpsPoints.clear();
    _totalDistance = 0;
    _elapsedSeconds = 0;
    _startTime = 0;
    _lastPoint = null;
  }

  @override
  Future<void> close() {
    _cleanup();
    return super.close();
  }
}

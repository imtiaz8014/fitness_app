import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/models/run_record.dart';
import '../../domain/repositories/stats_repository.dart';

// Events
abstract class StatsEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadStats extends StatsEvent {}

// Data models
class WeeklyStats {
  /// Distance per day for the last 7 days, indexed 0 = 6 days ago .. 6 = today
  final List<double> dailyDistances;

  /// Day labels (e.g. "Mon", "Tue") corresponding to each entry
  final List<String> dayLabels;

  double get totalDistance =>
      dailyDistances.fold(0.0, (sum, d) => sum + d);

  WeeklyStats({required this.dailyDistances, required this.dayLabels});
}

class MonthlyStats {
  final double totalDistance;
  final int totalRuns;
  final double totalTkEarned;

  MonthlyStats({
    required this.totalDistance,
    required this.totalRuns,
    required this.totalTkEarned,
  });
}

// States
abstract class StatsState extends Equatable {
  @override
  List<Object?> get props => [];
}

class StatsInitial extends StatsState {}

class StatsLoading extends StatsState {}

class StatsLoaded extends StatsState {
  final WeeklyStats weeklyStats;
  final MonthlyStats monthlyStats;
  final double totalDistance;
  final int totalRuns;
  final double totalTkEarned;
  final double averagePace;
  final int runningStreak;

  StatsLoaded({
    required this.weeklyStats,
    required this.monthlyStats,
    required this.totalDistance,
    required this.totalRuns,
    required this.totalTkEarned,
    required this.averagePace,
    required this.runningStreak,
  });

  @override
  List<Object?> get props => [weeklyStats, monthlyStats, totalDistance, totalRuns, totalTkEarned, averagePace, runningStreak];
}

class StatsError extends StatsState {
  final String message;
  StatsError(this.message);
  @override
  List<Object?> get props => [message];
}

class StatsBloc extends Bloc<StatsEvent, StatsState> {
  final StatsRepository statsRepository;

  StatsBloc({required this.statsRepository}) : super(StatsInitial()) {
    on<LoadStats>(_onLoadStats);
  }

  Future<void> _onLoadStats(LoadStats event, Emitter<StatsState> emit) async {
    emit(StatsLoading());
    try {
      final runs = await statsRepository.getAllRuns();
      final profile = await statsRepository.getUserProfile();

      // Only consider validated runs for stats
      final validatedRuns =
          runs.where((r) => r.status == 'validated').toList();

      final weeklyStats = _calculateWeeklyStats(validatedRuns);
      final monthlyStats = _calculateMonthlyStats(validatedRuns);
      final averagePace = _calculateAveragePace(validatedRuns);
      final streak = _calculateStreak(validatedRuns);

      emit(StatsLoaded(
        weeklyStats: weeklyStats,
        monthlyStats: monthlyStats,
        totalDistance: profile?.totalDistance ?? 0.0,
        totalRuns: profile?.totalRuns ?? 0,
        totalTkEarned: validatedRuns.fold(0.0, (sum, r) => sum + r.tkEarned),
        averagePace: averagePace,
        runningStreak: streak,
      ));
    } catch (e) {
      emit(StatsError(e.toString()));
    }
  }

  WeeklyStats _calculateWeeklyStats(List<RunRecord> runs) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final List<double> distances = List.filled(7, 0.0);
    final List<String> labels = [];

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (int i = 0; i < 7; i++) {
      final day = today.subtract(Duration(days: 6 - i));
      labels.add(dayNames[day.weekday - 1]);
    }

    for (final run in runs) {
      if (run.createdAt == null) continue;
      final runDate = DateTime(
          run.createdAt!.year, run.createdAt!.month, run.createdAt!.day);
      final diff = runDate.difference(today).inDays;
      if (diff >= -6 && diff <= 0) {
        final index = 6 + diff; // 0 = 6 days ago, 6 = today
        distances[index] += run.distance;
      }
    }

    return WeeklyStats(dailyDistances: distances, dayLabels: labels);
  }

  MonthlyStats _calculateMonthlyStats(List<RunRecord> runs) {
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);

    double totalDistance = 0;
    int totalRuns = 0;
    double totalTk = 0;

    for (final run in runs) {
      if (run.createdAt == null) continue;
      if (run.createdAt!.isAfter(startOfMonth) ||
          run.createdAt!.isAtSameMomentAs(startOfMonth)) {
        totalDistance += run.distance;
        totalRuns++;
        totalTk += run.tkEarned;
      }
    }

    return MonthlyStats(
      totalDistance: totalDistance,
      totalRuns: totalRuns,
      totalTkEarned: totalTk,
    );
  }

  double _calculateAveragePace(List<RunRecord> runs) {
    if (runs.isEmpty) return 0.0;
    final totalPace = runs.fold(0.0, (sum, r) => sum + r.pace);
    return totalPace / runs.length;
  }

  int _calculateStreak(List<RunRecord> runs) {
    if (runs.isEmpty) return 0;

    // Collect unique dates that had validated runs
    final Set<String> runDates = {};
    for (final run in runs) {
      if (run.createdAt == null) continue;
      final d = run.createdAt!;
      runDates.add('${d.year}-${d.month}-${d.day}');
    }

    if (runDates.isEmpty) return 0;

    final now = DateTime.now();
    var current = DateTime(now.year, now.month, now.day);
    int streak = 0;

    // Check if today or yesterday has a run (allow streak to continue if not yet run today)
    final todayKey = '${current.year}-${current.month}-${current.day}';
    if (!runDates.contains(todayKey)) {
      // Check yesterday to be lenient
      current = current.subtract(const Duration(days: 1));
      final yesterdayKey = '${current.year}-${current.month}-${current.day}';
      if (!runDates.contains(yesterdayKey)) {
        return 0;
      }
    }

    // Count consecutive days backwards
    while (true) {
      final key = '${current.year}-${current.month}-${current.day}';
      if (runDates.contains(key)) {
        streak++;
        current = current.subtract(const Duration(days: 1));
      } else {
        break;
      }
    }

    return streak;
  }
}

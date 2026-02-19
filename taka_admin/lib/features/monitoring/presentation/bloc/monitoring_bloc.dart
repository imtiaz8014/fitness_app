import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/models/treasury_status.dart';
import '../../domain/repositories/monitoring_repository.dart';

// --- Events ---

abstract class MonitoringEvent extends Equatable {
  const MonitoringEvent();

  @override
  List<Object?> get props => [];
}

class LoadTreasuryStatus extends MonitoringEvent {}

class RefreshTreasuryStatus extends MonitoringEvent {}

// --- States ---

abstract class MonitoringState extends Equatable {
  const MonitoringState();

  @override
  List<Object?> get props => [];
}

class MonitoringInitial extends MonitoringState {}

class MonitoringLoading extends MonitoringState {}

class MonitoringLoaded extends MonitoringState {
  final TreasuryStatus status;

  const MonitoringLoaded(this.status);

  @override
  List<Object?> get props => [status];
}

class MonitoringError extends MonitoringState {
  final String message;

  const MonitoringError(this.message);

  @override
  List<Object?> get props => [message];
}

// --- Bloc ---

class MonitoringBloc extends Bloc<MonitoringEvent, MonitoringState> {
  final MonitoringRepository monitoringRepository;

  MonitoringBloc({required this.monitoringRepository})
      : super(MonitoringInitial()) {
    on<LoadTreasuryStatus>(_onLoad);
    on<RefreshTreasuryStatus>(_onRefresh);
  }

  Future<void> _onLoad(
    LoadTreasuryStatus event,
    Emitter<MonitoringState> emit,
  ) async {
    emit(MonitoringLoading());
    try {
      final status = await monitoringRepository.getTreasuryStatus();
      emit(MonitoringLoaded(status));
    } catch (e) {
      emit(MonitoringError(e.toString()));
    }
  }

  Future<void> _onRefresh(
    RefreshTreasuryStatus event,
    Emitter<MonitoringState> emit,
  ) async {
    // Keep current data visible while refreshing
    try {
      final status = await monitoringRepository.getTreasuryStatus();
      emit(MonitoringLoaded(status));
    } catch (e) {
      emit(MonitoringError(e.toString()));
    }
  }
}

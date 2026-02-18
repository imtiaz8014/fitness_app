import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../services/firebase/firebase_run_service.dart';
import '../../domain/repositories/history_repository.dart';

// Events
abstract class HistoryEvent extends Equatable {
  @override
  List<Object?> get props => [];
}
class LoadHistory extends HistoryEvent {}
class LoadMoreHistory extends HistoryEvent {}

// States
abstract class HistoryState extends Equatable {
  @override
  List<Object?> get props => [];
}
class HistoryInitial extends HistoryState {}
class HistoryLoading extends HistoryState {}
class HistoryLoaded extends HistoryState {
  final List<RunRecord> runs;
  final bool hasMore;
  HistoryLoaded(this.runs, {this.hasMore = true});
  @override
  List<Object?> get props => [runs, hasMore];
}
class HistoryError extends HistoryState {
  final String message;
  HistoryError(this.message);
  @override
  List<Object?> get props => [message];
}

class HistoryBloc extends Bloc<HistoryEvent, HistoryState> {
  final HistoryRepository historyRepository;
  final List<RunRecord> _runs = [];

  HistoryBloc({required this.historyRepository}) : super(HistoryInitial()) {
    on<LoadHistory>(_onLoad);
    on<LoadMoreHistory>(_onLoadMore);
  }

  Future<void> _onLoad(LoadHistory event, Emitter<HistoryState> emit) async {
    emit(HistoryLoading());
    try {
      _runs.clear();
      final runs = await historyRepository.getRuns(limit: 20);
      _runs.addAll(runs);
      emit(HistoryLoaded(List.from(_runs), hasMore: runs.length == 20));
    } catch (e) {
      emit(HistoryError(e.toString()));
    }
  }

  Future<void> _onLoadMore(LoadMoreHistory event, Emitter<HistoryState> emit) async {
    if (_runs.isEmpty) return;
    try {
      final runs = await historyRepository.getRuns(
        limit: 20,
        startAfter: _runs.last.id,
      );
      _runs.addAll(runs);
      emit(HistoryLoaded(List.from(_runs), hasMore: runs.length == 20));
    } catch (e) {
      emit(HistoryError(e.toString()));
    }
  }
}

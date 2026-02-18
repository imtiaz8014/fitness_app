import 'dart:async';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../services/firebase/firebase_user_service.dart';
import '../../domain/repositories/home_repository.dart';

// Events
abstract class HomeEvent extends Equatable {
  @override
  List<Object?> get props => [];
}
class LoadHome extends HomeEvent {}
class RefreshBalance extends HomeEvent {}

// States
abstract class HomeState extends Equatable {
  @override
  List<Object?> get props => [];
}
class HomeInitial extends HomeState {}
class HomeLoading extends HomeState {}
class HomeLoaded extends HomeState {
  final UserProfile profile;
  HomeLoaded(this.profile);
  @override
  List<Object?> get props => [profile];
}
class HomeError extends HomeState {
  final String message;
  HomeError(this.message);
  @override
  List<Object?> get props => [message];
}

class HomeBloc extends Bloc<HomeEvent, HomeState> {
  final HomeRepository homeRepository;
  StreamSubscription? _userSub;

  HomeBloc({required this.homeRepository}) : super(HomeInitial()) {
    on<LoadHome>(_onLoadHome);
    on<RefreshBalance>(_onRefreshBalance);
  }

  Future<void> _onLoadHome(LoadHome event, Emitter<HomeState> emit) async {
    emit(HomeLoading());
    await _userSub?.cancel();
    await emit.forEach<UserProfile?>(
      homeRepository.getUserStream(),
      onData: (profile) {
        if (profile != null) return HomeLoaded(profile);
        return HomeError('Profile not found');
      },
      onError: (e, _) => HomeError(e.toString()),
    );
  }

  Future<void> _onRefreshBalance(RefreshBalance event, Emitter<HomeState> emit) async {
    try {
      await homeRepository.refreshBalance();
    } catch (e) {
      // Balance will sync via stream
    }
  }

  @override
  Future<void> close() {
    _userSub?.cancel();
    return super.close();
  }
}

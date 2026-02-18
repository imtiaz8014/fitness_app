import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../services/firebase/firebase_user_service.dart';
import '../../domain/repositories/profile_repository.dart';

// Events
abstract class ProfileEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadProfile extends ProfileEvent {}

class ToggleUnit extends ProfileEvent {}

class RefreshProfileBalance extends ProfileEvent {}

// States
abstract class ProfileState extends Equatable {
  @override
  List<Object?> get props => [];
}

class ProfileInitial extends ProfileState {}

class ProfileLoading extends ProfileState {}

class ProfileLoaded extends ProfileState {
  final UserProfile profile;
  final bool useMetric;

  ProfileLoaded({required this.profile, required this.useMetric});

  @override
  List<Object?> get props => [profile, useMetric];
}

class ProfileError extends ProfileState {
  final String message;

  ProfileError(this.message);

  @override
  List<Object?> get props => [message];
}

class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final ProfileRepository profileRepository;

  ProfileBloc({required this.profileRepository}) : super(ProfileInitial()) {
    on<LoadProfile>(_onLoadProfile);
    on<ToggleUnit>(_onToggleUnit);
    on<RefreshProfileBalance>(_onRefreshBalance);
  }

  Future<void> _onLoadProfile(
    LoadProfile event,
    Emitter<ProfileState> emit,
  ) async {
    emit(ProfileLoading());
    try {
      final useMetric = await profileRepository.getUseMetric();
      await emit.forEach<UserProfile?>(
        profileRepository.getUserStream(),
        onData: (profile) {
          if (profile != null) {
            return ProfileLoaded(profile: profile, useMetric: useMetric);
          }
          return ProfileError('Profile not found');
        },
        onError: (e, _) => ProfileError(e.toString()),
      );
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  Future<void> _onToggleUnit(
    ToggleUnit event,
    Emitter<ProfileState> emit,
  ) async {
    final currentState = state;
    if (currentState is ProfileLoaded) {
      final newUseMetric = !currentState.useMetric;
      await profileRepository.setUseMetric(newUseMetric);
      emit(ProfileLoaded(
        profile: currentState.profile,
        useMetric: newUseMetric,
      ));
    }
  }

  Future<void> _onRefreshBalance(
    RefreshProfileBalance event,
    Emitter<ProfileState> emit,
  ) async {
    try {
      await profileRepository.refreshBalance();
    } catch (e) {
      // Balance will sync via stream
    }
  }
}

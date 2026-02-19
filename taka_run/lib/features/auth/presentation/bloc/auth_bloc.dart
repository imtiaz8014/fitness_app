import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/repositories/auth_repository.dart';

// Events
abstract class AuthEvent extends Equatable {
  @override
  List<Object?> get props => [];
}
class CheckAuthStatus extends AuthEvent {}
class SignInWithGoogle extends AuthEvent {}
class SignOut extends AuthEvent {}

// States
abstract class AuthState extends Equatable {
  @override
  List<Object?> get props => [];
}
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class Authenticated extends AuthState {
  final String userId;
  Authenticated(this.userId);
  @override
  List<Object?> get props => [userId];
}
class Unauthenticated extends AuthState {}
class AuthError extends AuthState {
  final String message;
  AuthError(this.message);
  @override
  List<Object?> get props => [message];
}

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository authRepository;

  AuthBloc({required this.authRepository}) : super(AuthInitial()) {
    on<CheckAuthStatus>(_onCheckAuth);
    on<SignInWithGoogle>(_onSignInGoogle);
    on<SignOut>(_onSignOut);
  }

  Future<void> _onCheckAuth(CheckAuthStatus event, Emitter<AuthState> emit) async {
    final loggedIn = await authRepository.isLoggedIn();
    if (loggedIn) {
      emit(Authenticated(authRepository.getCurrentUserId()!));
    } else {
      emit(Unauthenticated());
    }
  }

  Future<void> _onSignInGoogle(SignInWithGoogle event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await authRepository.signInWithGoogle();
      emit(Authenticated(authRepository.getCurrentUserId()!));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onSignOut(SignOut event, Emitter<AuthState> emit) async {
    await authRepository.signOut();
    emit(Unauthenticated());
  }
}

import 'package:equatable/equatable.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_constants.dart';
import '../../domain/repositories/auth_repository.dart';

// Events
abstract class AuthEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class CheckAuthStatus extends AuthEvent {}

class SignInWithEmail extends AuthEvent {
  final String email;
  final String password;
  SignInWithEmail(this.email, this.password);
  @override
  List<Object?> get props => [email, password];
}

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
  final String? email;
  Authenticated(this.userId, this.email);
  @override
  List<Object?> get props => [userId, email];
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
    on<SignInWithEmail>(_onSignInEmail);
    on<SignInWithGoogle>(_onSignInGoogle);
    on<SignOut>(_onSignOut);
  }

  Future<void> _onCheckAuth(
      CheckAuthStatus event, Emitter<AuthState> emit) async {
    final loggedIn = await authRepository.isLoggedIn();
    if (loggedIn) {
      final email = authRepository.getCurrentUserEmail();
      if (email != AppConstants.superAdminEmail) {
        await authRepository.signOut();
        emit(AuthError('Access denied. Admin only.'));
        return;
      }
      emit(Authenticated(authRepository.getCurrentUserId()!, email));
    } else {
      emit(Unauthenticated());
    }
  }

  Future<void> _onSignInEmail(
      SignInWithEmail event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await authRepository.signInWithEmail(event.email, event.password);
      final email = authRepository.getCurrentUserEmail();
      if (email != AppConstants.superAdminEmail) {
        await authRepository.signOut();
        emit(AuthError('Access denied. Admin only.'));
        return;
      }
      emit(Authenticated(authRepository.getCurrentUserId()!, email));
    } catch (e) {
      emit(AuthError(_mapAuthError(e)));
    }
  }

  Future<void> _onSignInGoogle(
      SignInWithGoogle event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await authRepository.signInWithGoogle();
      final email = authRepository.getCurrentUserEmail();
      if (email != AppConstants.superAdminEmail) {
        await authRepository.signOut();
        emit(AuthError('Access denied. Admin only.'));
        return;
      }
      emit(Authenticated(authRepository.getCurrentUserId()!, email));
    } catch (e) {
      emit(AuthError(_mapAuthError(e)));
    }
  }

  Future<void> _onSignOut(SignOut event, Emitter<AuthState> emit) async {
    await authRepository.signOut();
    emit(Unauthenticated());
  }

  String _mapAuthError(Object e) {
    if (e is FirebaseAuthException) {
      switch (e.code) {
        case 'user-not-found':
          return 'No account found with this email.';
        case 'wrong-password':
        case 'invalid-credential':
          return 'Invalid email or password.';
        case 'invalid-email':
          return 'Please enter a valid email address.';
        case 'too-many-requests':
          return 'Too many attempts. Please try again later.';
        case 'network-request-failed':
          return 'Network error. Check your connection.';
        default:
          return 'Authentication failed. Please try again.';
      }
    }
    return 'Something went wrong. Please try again.';
  }
}

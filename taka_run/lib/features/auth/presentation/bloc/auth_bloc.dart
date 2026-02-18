import 'package:equatable/equatable.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

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
class SignUpWithEmail extends AuthEvent {
  final String email;
  final String password;
  final String displayName;
  SignUpWithEmail(this.email, this.password, this.displayName);
  @override
  List<Object?> get props => [email, password, displayName];
}
class SignInWithGoogle extends AuthEvent {}
class DemoSignIn extends AuthEvent {}
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
    on<SignInWithEmail>(_onSignInEmail);
    on<SignUpWithEmail>(_onSignUpEmail);
    on<SignInWithGoogle>(_onSignInGoogle);
    on<DemoSignIn>(_onDemoSignIn);
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

  Future<void> _onSignInEmail(SignInWithEmail event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await authRepository.signInWithEmail(event.email, event.password);
      emit(Authenticated(authRepository.getCurrentUserId()!));
    } catch (e) {
      emit(AuthError(_mapAuthError(e)));
    }
  }

  Future<void> _onSignUpEmail(SignUpWithEmail event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await authRepository.signUpWithEmail(event.email, event.password, event.displayName);
      emit(Authenticated(authRepository.getCurrentUserId()!));
    } catch (e) {
      emit(AuthError(_mapAuthError(e)));
    }
  }

  Future<void> _onSignInGoogle(SignInWithGoogle event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await authRepository.signInWithGoogle();
      emit(Authenticated(authRepository.getCurrentUserId()!));
    } catch (e) {
      emit(AuthError(_mapAuthError(e)));
    }
  }

  Future<void> _onDemoSignIn(DemoSignIn event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      // Demo credentials injected at build time via --dart-define
      const demoEmail = String.fromEnvironment('DEMO_EMAIL');
      const demoPassword = String.fromEnvironment('DEMO_PASSWORD');
      if (demoEmail.isNotEmpty && demoPassword.isNotEmpty) {
        await authRepository.signInWithEmail(demoEmail, demoPassword);
      } else {
        // Fallback to anonymous auth if no demo credentials configured
        await authRepository.signInAnonymously();
      }
      emit(Authenticated(authRepository.getCurrentUserId()!));
    } catch (e) {
      emit(AuthError('Demo login failed. Please try again.'));
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
        case 'email-already-in-use':
          return 'An account already exists with this email.';
        case 'weak-password':
          return 'Password is too weak. Use at least 6 characters.';
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

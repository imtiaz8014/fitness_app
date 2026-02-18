import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'services/location/location_service.dart';
import 'services/firebase/firebase_run_service.dart';
import 'services/firebase/firebase_user_service.dart';

import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/domain/repositories/auth_repository.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';

import 'features/home/data/repositories/home_repository_impl.dart';
import 'features/home/domain/repositories/home_repository.dart';
import 'features/home/presentation/bloc/home_bloc.dart';

import 'features/run/data/repositories/run_repository_impl.dart';
import 'features/run/domain/repositories/run_repository.dart';
import 'features/run/presentation/bloc/run_bloc.dart';

import 'features/history/data/repositories/history_repository_impl.dart';
import 'features/history/domain/repositories/history_repository.dart';
import 'features/history/presentation/bloc/history_bloc.dart';

import 'features/profile/data/repositories/profile_repository_impl.dart';
import 'features/profile/domain/repositories/profile_repository.dart';
import 'features/profile/presentation/bloc/profile_bloc.dart';

import 'features/stats/data/repositories/stats_repository_impl.dart';
import 'features/stats/domain/repositories/stats_repository.dart';
import 'features/stats/presentation/bloc/stats_bloc.dart';

final sl = GetIt.instance;

Future<void> initializeDependencies() async {
  final prefs = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => prefs);

  // Services
  sl.registerLazySingleton(() => LocationService());
  sl.registerLazySingleton(() => FirebaseRunService());
  sl.registerLazySingleton(() => FirebaseUserService());

  // Repositories
  sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl());
  sl.registerLazySingleton<HomeRepository>(
    () => HomeRepositoryImpl(userService: sl<FirebaseUserService>()),
  );
  sl.registerLazySingleton<RunRepository>(
    () => RunRepositoryImpl(
      locationService: sl<LocationService>(),
      runService: sl<FirebaseRunService>(),
    ),
  );
  sl.registerLazySingleton<HistoryRepository>(
    () => HistoryRepositoryImpl(runService: sl<FirebaseRunService>()),
  );
  sl.registerLazySingleton<ProfileRepository>(
    () => ProfileRepositoryImpl(
      userService: sl<FirebaseUserService>(),
      prefs: sl<SharedPreferences>(),
    ),
  );
  sl.registerLazySingleton<StatsRepository>(
    () => StatsRepositoryImpl(
      runService: sl<FirebaseRunService>(),
      userService: sl<FirebaseUserService>(),
    ),
  );

  // BLoCs
  sl.registerFactory(() => AuthBloc(authRepository: sl<AuthRepository>()));
  sl.registerFactory(() => HomeBloc(homeRepository: sl<HomeRepository>()));
  sl.registerFactory(
    () => RunBloc(runRepository: sl<RunRepository>()),
  );
  sl.registerFactory(
    () => HistoryBloc(historyRepository: sl<HistoryRepository>()),
  );
  sl.registerFactory(
    () => ProfileBloc(profileRepository: sl<ProfileRepository>()),
  );
  sl.registerFactory(
    () => StatsBloc(statsRepository: sl<StatsRepository>()),
  );
}

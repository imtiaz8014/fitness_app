import 'package:get_it/get_it.dart';

import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/domain/repositories/auth_repository.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';

import 'features/markets/data/repositories/market_repository_impl.dart';
import 'features/markets/domain/repositories/market_repository.dart';
import 'features/markets/presentation/bloc/market_bloc.dart';

import 'features/monitoring/data/repositories/monitoring_repository_impl.dart';
import 'features/monitoring/domain/repositories/monitoring_repository.dart';
import 'features/monitoring/presentation/bloc/monitoring_bloc.dart';

final sl = GetIt.instance;

Future<void> initializeDependencies() async {
  // Repositories
  sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl());
  sl.registerLazySingleton<MarketRepository>(() => MarketRepositoryImpl());
  sl.registerLazySingleton<MonitoringRepository>(
      () => MonitoringRepositoryImpl());

  // BLoCs
  sl.registerFactory(() => AuthBloc(authRepository: sl<AuthRepository>()));
  sl.registerFactory(() => MarketBloc(marketRepository: sl<MarketRepository>()));
  sl.registerFactory(
      () => MonitoringBloc(monitoringRepository: sl<MonitoringRepository>()));
}

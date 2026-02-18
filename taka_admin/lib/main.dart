import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/theme/app_theme.dart';
import 'firebase_options.dart';
import 'injection_container.dart' as di;
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/markets/presentation/bloc/market_bloc.dart';
import 'features/markets/presentation/pages/admin_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  await di.initializeDependencies();
  runApp(const TakaAdminApp());
}

class TakaAdminApp extends StatelessWidget {
  const TakaAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
            create: (_) => di.sl<AuthBloc>()..add(CheckAuthStatus())),
      ],
      child: MaterialApp(
        title: 'TAKA Admin',
        theme: AppTheme.darkTheme,
        debugShowCheckedModeBanner: false,
        home: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state is Authenticated) {
              return BlocProvider(
                create: (_) => di.sl<MarketBloc>()
                  ..add(CheckAdminAndLoadMarkets(state.userId)),
                child: const AdminPage(),
              );
            }
            if (state is Unauthenticated || state is AuthError) {
              return const LoginPage();
            }
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          },
        ),
      ),
    );
  }
}

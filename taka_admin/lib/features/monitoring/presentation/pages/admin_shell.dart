import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../injection_container.dart' as di;
import '../../../markets/presentation/bloc/market_bloc.dart';
import '../../../markets/presentation/pages/admin_page.dart';
import '../bloc/monitoring_bloc.dart';
import 'monitoring_page.dart';

class AdminShell extends StatefulWidget {
  final String userId;

  const AdminShell({super.key, required this.userId});

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int _currentIndex = 0;

  late final MarketBloc _marketBloc;
  late final MonitoringBloc _monitoringBloc;

  @override
  void initState() {
    super.initState();
    _marketBloc = di.sl<MarketBloc>()
      ..add(CheckAdminAndLoadMarkets(widget.userId));
    _monitoringBloc = di.sl<MonitoringBloc>()..add(LoadTreasuryStatus());
  }

  @override
  void dispose() {
    _marketBloc.close();
    _monitoringBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          BlocProvider.value(
            value: _marketBloc,
            child: const AdminPage(),
          ),
          BlocProvider.value(
            value: _monitoringBloc,
            child: const MonitoringPage(),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: const Color(0xFF1E1E1E),
        selectedItemColor: const Color(0xFF00C853),
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.storefront),
            label: 'Markets',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.monitor_heart),
            label: 'Monitoring',
          ),
        ],
      ),
    );
  }
}

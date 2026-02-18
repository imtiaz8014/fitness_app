import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../injection_container.dart';
import '../bloc/home_bloc.dart';
import '../../../run/presentation/pages/active_run_page.dart';
import '../../../run/presentation/bloc/run_bloc.dart';
import '../../../history/presentation/pages/history_page.dart';
import '../../../stats/presentation/pages/stats_page.dart';
import '../../../profile/presentation/pages/profile_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<HomeBloc>()..add(LoadHome()),
      child: const _HomeView(),
    );
  }
}

class _HomeView extends StatelessWidget {
  const _HomeView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('TAKA Run'),
        actions: [
          IconButton(
            icon: const Icon(Icons.bar_chart),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const StatsPage()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProfilePage()),
            ),
          ),
        ],
      ),
      body: BlocBuilder<HomeBloc, HomeState>(
        builder: (context, state) {
          if (state is HomeLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is HomeError) {
            return Center(child: Text(state.message));
          }
          if (state is HomeLoaded) {
            final profile = state.profile;
            return RefreshIndicator(
              onRefresh: () async {
                context.read<HomeBloc>().add(RefreshBalance());
              },
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Balance Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          const Text('TK Balance', style: TextStyle(color: Colors.grey, fontSize: 14)),
                          const SizedBox(height: 8),
                          Text(
                            '${profile.tkBalance.toStringAsFixed(2)} TK',
                            style: const TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF00C853),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Wallet: ${profile.walletAddress != null ? "${profile.walletAddress!.substring(0, 6)}...${profile.walletAddress!.substring(profile.walletAddress!.length - 4)}" : "Creating..."}',
                            style: TextStyle(color: Colors.grey[500], fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Stats Row
                  Row(
                    children: [
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                const Icon(Icons.straighten, color: Color(0xFF00BFA5)),
                                const SizedBox(height: 8),
                                Text(
                                  '${profile.totalDistance.toStringAsFixed(1)} km',
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                                const Text('Total Distance', style: TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                const Icon(Icons.directions_run, color: Color(0xFF00BFA5)),
                                const SizedBox(height: 8),
                                Text(
                                  '${profile.totalRuns}',
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                                const Text('Total Runs', style: TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Simulate Run Button (for testing transactions)
                  SizedBox(
                    height: 48,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        final runBloc = sl<RunBloc>();
                        runBloc.add(SimulateRun());
                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (_) => BlocProvider.value(
                            value: runBloc,
                            child: BlocConsumer<RunBloc, RunState>(
                              listener: (ctx, state) {
                                if (state is RunCompleted || state is RunError) {
                                  context.read<HomeBloc>().add(RefreshBalance());
                                }
                              },
                              builder: (ctx, state) {
                                if (state is RunSubmitting) {
                                  return const AlertDialog(
                                    title: Text('Simulating Run...'),
                                    content: SizedBox(
                                      height: 80,
                                      child: Center(child: CircularProgressIndicator()),
                                    ),
                                  );
                                }
                                if (state is RunCompleted) {
                                  final result = state.result;
                                  return AlertDialog(
                                    title: Text(result.validated ? 'Simulation Complete!' : 'Run Rejected'),
                                    content: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          result.validated ? Icons.celebration : Icons.warning,
                                          size: 48,
                                          color: result.validated ? const Color(0xFF00C853) : Colors.orange,
                                        ),
                                        const SizedBox(height: 16),
                                        if (result.validated)
                                          Text(
                                            '+${result.tkEarned.toStringAsFixed(2)} TK',
                                            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF00C853)),
                                          )
                                        else
                                          Text(result.errors.join('\n')),
                                      ],
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed: () {
                                          Navigator.pop(ctx);
                                          runBloc.close();
                                        },
                                        child: const Text('OK'),
                                      ),
                                    ],
                                  );
                                }
                                if (state is RunError) {
                                  return AlertDialog(
                                    title: const Text('Error'),
                                    content: Text(state.message),
                                    actions: [
                                      TextButton(
                                        onPressed: () {
                                          Navigator.pop(ctx);
                                          runBloc.close();
                                        },
                                        child: const Text('OK'),
                                      ),
                                    ],
                                  );
                                }
                                return const SizedBox();
                              },
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.science, size: 20, color: Colors.amber),
                      label: const Text('Simulate Run (Test)', style: TextStyle(fontSize: 14, color: Colors.amber)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.amber),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Start Run Button
                  SizedBox(
                    height: 64,
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ActiveRunPage()),
                      ),
                      icon: const Icon(Icons.play_arrow, size: 32),
                      label: const Text('Start Run', style: TextStyle(fontSize: 20)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // History & Stats Row
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const HistoryPage()),
                          ),
                          icon: const Icon(Icons.history),
                          label: const Text('History'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            side: BorderSide(color: Colors.grey.shade600),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const StatsPage()),
                          ),
                          icon: const Icon(Icons.bar_chart),
                          label: const Text('Statistics'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            side: BorderSide(color: Colors.grey.shade600),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }
          return const SizedBox();
        },
      ),
    );
  }
}

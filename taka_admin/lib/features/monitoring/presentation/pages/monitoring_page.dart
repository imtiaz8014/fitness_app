import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/models/treasury_status.dart';
import '../bloc/monitoring_bloc.dart';

class MonitoringPage extends StatefulWidget {
  const MonitoringPage({super.key});

  @override
  State<MonitoringPage> createState() => _MonitoringPageState();
}

class _MonitoringPageState extends State<MonitoringPage> {
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    _autoRefreshTimer = Timer.periodic(
      const Duration(seconds: 60),
      (_) => context.read<MonitoringBloc>().add(RefreshTreasuryStatus()),
    );
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<MonitoringBloc, MonitoringState>(
      builder: (context, state) {
        if (state is MonitoringLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state is MonitoringError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    state.message,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.red),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context
                        .read<MonitoringBloc>()
                        .add(LoadTreasuryStatus()),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        }

        if (state is MonitoringLoaded) {
          return RefreshIndicator(
            onRefresh: () async {
              context.read<MonitoringBloc>().add(RefreshTreasuryStatus());
              // Wait for state change
              await context.read<MonitoringBloc>().stream.firstWhere(
                    (s) => s is MonitoringLoaded || s is MonitoringError,
                  );
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _TreasuryCard(status: state.status),
                const SizedBox(height: 12),
                _PendingOpsCard(pendingOps: state.status.pendingOps),
                const SizedBox(height: 12),
                _AbandonedOpsCard(abandonedOps: state.status.abandonedOps),
                const SizedBox(height: 12),
                _PlatformStatsCard(stats: state.status.platformStats),
              ],
            ),
          );
        }

        // MonitoringInitial
        return const Center(child: CircularProgressIndicator());
      },
    );
  }
}

// --- Treasury Card ---

class _TreasuryCard extends StatelessWidget {
  final TreasuryStatus status;

  const _TreasuryCard({required this.status});

  Color _statusColor() {
    switch (status.monStatus) {
      case 'critical':
        return Colors.red;
      case 'low':
        return Colors.amber;
      default:
        return Colors.green;
    }
  }

  String _statusLabel() {
    switch (status.monStatus) {
      case 'critical':
        return 'CRITICAL';
      case 'low':
        return 'LOW';
      default:
        return 'OK';
    }
  }

  String _truncateAddress(String address) {
    if (address.length <= 12) return address;
    return '${address.substring(0, 6)}...${address.substring(address.length - 4)}';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.account_balance_wallet, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Treasury',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _statusColor().withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _statusColor()),
                  ),
                  child: Text(
                    _statusLabel(),
                    style: TextStyle(
                      color: _statusColor(),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _BalanceRow(
              label: 'MON (Gas)',
              value: '${double.tryParse(status.monBalance)?.toStringAsFixed(4) ?? status.monBalance} MON',
              valueColor: _statusColor(),
            ),
            const SizedBox(height: 8),
            _BalanceRow(
              label: 'TK Token',
              value: '${double.tryParse(status.tkBalance)?.toStringAsFixed(2) ?? status.tkBalance} TK',
            ),
            const SizedBox(height: 8),
            Text(
              _truncateAddress(status.treasuryAddress),
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade500,
                fontFamily: 'monospace',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BalanceRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _BalanceRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: Colors.grey.shade400)),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: valueColor,
          ),
        ),
      ],
    );
  }
}

// --- Pending Ops Card ---

class _PendingOpsCard extends StatelessWidget {
  final PendingOps pendingOps;

  const _PendingOpsCard({required this.pendingOps});

  @override
  Widget build(BuildContext context) {
    final allClear = pendingOps.total == 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.pending_actions, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Pending Operations',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                if (!allClear)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${pendingOps.total}',
                      style: const TextStyle(
                        color: Colors.amber,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (allClear)
              Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green.shade400, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'All clear',
                    style: TextStyle(color: Colors.green.shade400),
                  ),
                ],
              )
            else ...[
              _OpRow(icon: Icons.directions_run, label: 'Runs', count: pendingOps.runs),
              _OpRow(icon: Icons.casino, label: 'Bets', count: pendingOps.bets),
              _OpRow(icon: Icons.storefront, label: 'Markets', count: pendingOps.markets),
              _OpRow(icon: Icons.card_giftcard, label: 'Welcome Bonuses', count: pendingOps.welcomeBonuses),
              _OpRow(icon: Icons.redeem, label: 'Claims', count: pendingOps.claims),
            ],
          ],
        ),
      ),
    );
  }
}

// --- Abandoned Ops Card ---

class _AbandonedOpsCard extends StatelessWidget {
  final AbandonedOps abandonedOps;

  const _AbandonedOpsCard({required this.abandonedOps});

  @override
  Widget build(BuildContext context) {
    final hasAbandoned = abandonedOps.total > 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  size: 20,
                  color: hasAbandoned ? Colors.red : null,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Abandoned Operations',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (!hasAbandoned)
              Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green.shade400, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'None',
                    style: TextStyle(color: Colors.green.shade400),
                  ),
                ],
              )
            else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${abandonedOps.total} operations exceeded max retries',
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              _OpRow(icon: Icons.directions_run, label: 'Runs', count: abandonedOps.runs),
              _OpRow(icon: Icons.casino, label: 'Bets', count: abandonedOps.bets),
              _OpRow(icon: Icons.storefront, label: 'Markets', count: abandonedOps.markets),
            ],
          ],
        ),
      ),
    );
  }
}

// --- Platform Stats Card ---

class _PlatformStatsCard extends StatelessWidget {
  final PlatformStats stats;

  const _PlatformStatsCard({required this.stats});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.analytics, size: 20),
                SizedBox(width: 8),
                Text(
                  'Platform Stats',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _StatTile(
                    label: 'Markets',
                    value: '${stats.totalMarkets}',
                    icon: Icons.storefront,
                  ),
                ),
                Expanded(
                  child: _StatTile(
                    label: 'Volume',
                    value: '${stats.totalVolume} TK',
                    icon: Icons.show_chart,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _StatTile(
                    label: 'Users',
                    value: '${stats.activeUsers}',
                    icon: Icons.people,
                  ),
                ),
                Expanded(
                  child: _StatTile(
                    label: 'TK Distributed',
                    value: '${stats.tkDistributed}',
                    icon: Icons.toll,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _StatTile({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, size: 24, color: Colors.grey.shade400),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }
}

// --- Shared op row ---

class _OpRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final int count;

  const _OpRow({
    required this.icon,
    required this.label,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    if (count == 0) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey.shade400),
          const SizedBox(width: 8),
          Text(label),
          const Spacer(),
          Text(
            '$count',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

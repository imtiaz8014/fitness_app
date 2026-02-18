import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/models/market.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../bloc/market_bloc.dart';
import '../widgets/market_card.dart';
import '../widgets/group_card.dart';
import '../widgets/create_market_dialog.dart';
import '../widgets/create_market_group_dialog.dart';

class _GroupData {
  final String groupId;
  final String groupTitle;
  final List<Market> markets;
  final DateTime? latestCreatedAt;

  _GroupData({
    required this.groupId,
    required this.groupTitle,
    required this.markets,
    this.latestCreatedAt,
  });
}

class AdminPage extends StatefulWidget {
  const AdminPage({super.key});

  @override
  State<AdminPage> createState() => _AdminPageState();
}

class _AdminPageState extends State<AdminPage> {
  String _viewMode = 'grouped'; // 'grouped' or 'flat'

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    final email =
        authState is Authenticated ? authState.email ?? 'Admin' : 'Admin';

    return Scaffold(
      appBar: AppBar(
        title: const Text('TAKA Admin'),
        actions: [
          // View toggle
          IconButton(
            icon: Icon(
              _viewMode == 'grouped' ? Icons.folder_open : Icons.list,
            ),
            tooltip:
                _viewMode == 'grouped' ? 'Switch to flat view' : 'Switch to grouped view',
            onPressed: () {
              setState(() {
                _viewMode = _viewMode == 'grouped' ? 'flat' : 'grouped';
              });
            },
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Center(
              child: Text(email,
                  style: TextStyle(color: Colors.grey[400], fontSize: 13)),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthBloc>().add(SignOut()),
          ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.extended(
            heroTag: 'createGroup',
            onPressed: () => _showCreateGroupDialog(context),
            icon: const Icon(Icons.folder_open),
            label: const Text('New Group'),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            heroTag: 'createMarket',
            onPressed: () => _showCreateDialog(context),
            icon: const Icon(Icons.add),
            label: const Text('New Market'),
          ),
        ],
      ),
      body: BlocListener<MarketBloc, MarketState>(
        listener: (context, state) {
          if (state is MarketLoaded && state.successMsg != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.successMsg!),
                backgroundColor: Colors.green,
              ),
            );
          }
          if (state is MarketLoaded && state.errorMsg != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMsg!),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
        child: BlocBuilder<MarketBloc, MarketState>(
          builder: (context, state) {
            if (state is MarketLoading) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is AccessDenied) {
              return const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.block, size: 64, color: Colors.red),
                    SizedBox(height: 16),
                    Text('Access Denied',
                        style: TextStyle(
                            fontSize: 24, fontWeight: FontWeight.bold)),
                    SizedBox(height: 8),
                    Text('Your account does not have admin privileges.',
                        style: TextStyle(color: Colors.grey)),
                  ],
                ),
              );
            }
            if (state is MarketError) {
              return Center(child: Text('Error: ${state.message}'));
            }
            if (state is MarketLoaded) {
              if (state.markets.isEmpty) {
                return const Center(
                  child: Text('No markets yet. Tap + to create one.',
                      style: TextStyle(color: Colors.grey)),
                );
              }

              if (_viewMode == 'flat') {
                return _buildFlatList(state.markets);
              }
              return _buildGroupedList(state.markets);
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildFlatList(List<Market> markets) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: markets.length,
      itemBuilder: (context, index) =>
          MarketCard(market: markets[index]),
    );
  }

  Widget _buildGroupedList(List<Market> markets) {
    // Separate into groups and standalone
    final groupMap = <String, _GroupData>{};
    final standalone = <Market>[];

    for (final m in markets) {
      if (m.groupId != null && m.groupId!.isNotEmpty) {
        final existing = groupMap[m.groupId!];
        if (existing != null) {
          existing.markets.add(m);
        } else {
          groupMap[m.groupId!] = _GroupData(
            groupId: m.groupId!,
            groupTitle: m.groupTitle ?? m.title,
            markets: [m],
            latestCreatedAt: m.createdAt,
          );
        }
      } else {
        standalone.add(m);
      }
    }

    // Sort markets within each group by deadline
    for (final g in groupMap.values) {
      g.markets.sort((a, b) {
        final aD = a.deadline ?? DateTime(2099);
        final bD = b.deadline ?? DateTime(2099);
        return aD.compareTo(bD);
      });
    }

    final groups = groupMap.values.toList()
      ..sort((a, b) {
        final aT = a.latestCreatedAt ?? DateTime(0);
        final bT = b.latestCreatedAt ?? DateTime(0);
        return bT.compareTo(aT);
      });

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Summary
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _summaryChip(
                Icons.folder,
                '${groups.length} groups',
                Colors.purple,
              ),
              _summaryChip(
                Icons.show_chart,
                '${standalone.length} standalone',
                Colors.blue,
              ),
              _summaryChip(
                Icons.receipt_long,
                '${markets.length} total',
                Colors.grey,
              ),
            ],
          ),
        ),

        // Groups
        if (groups.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              'Grouped Markets',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Colors.grey[400],
              ),
            ),
          ),
          ...groups.map((g) => GroupCard(
                groupId: g.groupId,
                groupTitle: g.groupTitle,
                markets: g.markets,
              )),
        ],

        // Standalone
        if (standalone.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 8),
            child: Text(
              'Standalone Markets',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Colors.grey[400],
              ),
            ),
          ),
          ...standalone.map((m) => MarketCard(market: m)),
        ],
      ],
    );
  }

  Widget _summaryChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: color, fontSize: 12)),
        ],
      ),
    );
  }

  void _showCreateDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => BlocProvider.value(
        value: context.read<MarketBloc>(),
        child: const CreateMarketDialog(),
      ),
    );
  }

  void _showCreateGroupDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => BlocProvider.value(
        value: context.read<MarketBloc>(),
        child: const CreateMarketGroupDialog(),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../core/models/market.dart';
import '../bloc/market_bloc.dart';

class MarketCard extends StatelessWidget {
  final Market market;
  final bool showGroupBadge;
  const MarketCard({
    super.key,
    required this.market,
    this.showGroupBadge = true,
  });

  @override
  Widget build(BuildContext context) {
    final deadlineStr = market.deadline != null
        ? DateFormat('MMM d, yyyy h:mm a').format(market.deadline!)
        : 'No deadline';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    market.title,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                _StatusChip(status: market.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(market.description,
                style: TextStyle(color: Colors.grey[400], fontSize: 13)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                _InfoChip(icon: Icons.category, label: market.category),
                _InfoChip(icon: Icons.schedule, label: deadlineStr),
                if (showGroupBadge && market.groupTitle != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.purple.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: Colors.purple.withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.folder,
                            size: 14,
                            color: Colors.purple[300]),
                        const SizedBox(width: 4),
                        Text(
                          market.groupTitle!,
                          style: TextStyle(
                              color: Colors.purple[300], fontSize: 12),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Volume: ${market.totalVolume.toStringAsFixed(1)} TK  |  '
              'YES: ${market.totalYesAmount.toStringAsFixed(1)}  '
              'NO: ${market.totalNoAmount.toStringAsFixed(1)}',
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
            ),
            if (market.resolution != null) ...[
              const SizedBox(height: 4),
              Text('Resolution: ${market.resolution!.toUpperCase()}',
                  style: const TextStyle(
                      color: Colors.amber, fontWeight: FontWeight.bold)),
            ],
            if (market.status == 'open') ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.check, size: 16,
                        color: Colors.green),
                    label: const Text('YES'),
                    onPressed: () => _confirmAction(
                        context, 'Resolve YES', () {
                      context
                          .read<MarketBloc>()
                          .add(ResolveMarket(market.id, true));
                    }),
                  ),
                  ActionChip(
                    avatar:
                        const Icon(Icons.close, size: 16, color: Colors.red),
                    label: const Text('NO'),
                    onPressed: () => _confirmAction(
                        context, 'Resolve NO', () {
                      context
                          .read<MarketBloc>()
                          .add(ResolveMarket(market.id, false));
                    }),
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.cancel, size: 16,
                        color: Colors.orange),
                    label: const Text('Cancel'),
                    onPressed: () => _confirmAction(
                        context, 'Cancel market (refund all bets)', () {
                      context
                          .read<MarketBloc>()
                          .add(CancelMarket(market.id));
                    }),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _confirmAction(
      BuildContext context, String actionLabel, VoidCallback onConfirm) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Action'),
        content: Text('Are you sure you want to: $actionLabel?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              onConfirm();
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'open' => Colors.green,
      'closed' => Colors.orange,
      'resolved' => Colors.blue,
      'cancelled' => Colors.red,
      _ => Colors.grey,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
            color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: Colors.grey[500]),
        const SizedBox(width: 4),
        Text(label,
            style: TextStyle(color: Colors.grey[500], fontSize: 12)),
      ],
    );
  }
}

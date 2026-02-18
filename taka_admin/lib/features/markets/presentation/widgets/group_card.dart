import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/models/market.dart';
import '../bloc/market_bloc.dart';
import 'market_card.dart';

class GroupCard extends StatelessWidget {
  final String groupId;
  final String groupTitle;
  final List<Market> markets;

  const GroupCard({
    super.key,
    required this.groupId,
    required this.groupTitle,
    required this.markets,
  });

  @override
  Widget build(BuildContext context) {
    final totalVolume =
        markets.fold<double>(0, (sum, m) => sum + m.totalVolume);
    final openCount = markets.where((m) => m.status == 'open').length;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.purple.withValues(alpha: 0.4)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          childrenPadding:
              const EdgeInsets.only(left: 12, right: 12, bottom: 12),
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.purple.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.folder, color: Colors.purple[300], size: 24),
          ),
          title: Text(
            groupTitle,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                _badge(
                  '${markets.length} outcomes',
                  Colors.purple,
                ),
                _badge(
                  '$openCount open',
                  Colors.green,
                ),
                _badge(
                  '${totalVolume.toStringAsFixed(0)} TK',
                  Colors.grey,
                ),
              ],
            ),
          ),
          initiallyExpanded: false,
          children: [
            const Divider(),
            ...markets.map(
              (m) => BlocProvider.value(
                value: context.read<MarketBloc>(),
                child: MarketCard(market: m, showGroupBadge: false),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _badge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

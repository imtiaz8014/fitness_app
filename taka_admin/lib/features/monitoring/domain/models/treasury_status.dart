class PendingOps {
  final int runs;
  final int bets;
  final int markets;
  final int welcomeBonuses;
  final int claims;

  const PendingOps({
    required this.runs,
    required this.bets,
    required this.markets,
    required this.welcomeBonuses,
    required this.claims,
  });

  int get total => runs + bets + markets + welcomeBonuses + claims;

  factory PendingOps.fromMap(Map<String, dynamic> map) {
    return PendingOps(
      runs: (map['runs'] as num?)?.toInt() ?? 0,
      bets: (map['bets'] as num?)?.toInt() ?? 0,
      markets: (map['markets'] as num?)?.toInt() ?? 0,
      welcomeBonuses: (map['welcomeBonuses'] as num?)?.toInt() ?? 0,
      claims: (map['claims'] as num?)?.toInt() ?? 0,
    );
  }
}

class AbandonedOps {
  final int runs;
  final int bets;
  final int markets;

  const AbandonedOps({
    required this.runs,
    required this.bets,
    required this.markets,
  });

  int get total => runs + bets + markets;

  factory AbandonedOps.fromMap(Map<String, dynamic> map) {
    return AbandonedOps(
      runs: (map['runs'] as num?)?.toInt() ?? 0,
      bets: (map['bets'] as num?)?.toInt() ?? 0,
      markets: (map['markets'] as num?)?.toInt() ?? 0,
    );
  }
}

class PlatformStats {
  final int totalMarkets;
  final int totalVolume;
  final int activeUsers;
  final int tkDistributed;

  const PlatformStats({
    required this.totalMarkets,
    required this.totalVolume,
    required this.activeUsers,
    required this.tkDistributed,
  });

  factory PlatformStats.fromMap(Map<String, dynamic> map) {
    return PlatformStats(
      totalMarkets: (map['totalMarkets'] as num?)?.toInt() ?? 0,
      totalVolume: (map['totalVolume'] as num?)?.toInt() ?? 0,
      activeUsers: (map['activeUsers'] as num?)?.toInt() ?? 0,
      tkDistributed: (map['tkDistributed'] as num?)?.toInt() ?? 0,
    );
  }
}

class TreasuryStatus {
  final String treasuryAddress;
  final String monBalance;
  final String tkBalance;
  final String monStatus; // "ok", "low", "critical"
  final PendingOps pendingOps;
  final AbandonedOps abandonedOps;
  final PlatformStats platformStats;

  const TreasuryStatus({
    required this.treasuryAddress,
    required this.monBalance,
    required this.tkBalance,
    required this.monStatus,
    required this.pendingOps,
    required this.abandonedOps,
    required this.platformStats,
  });

  factory TreasuryStatus.fromMap(Map<String, dynamic> map) {
    return TreasuryStatus(
      treasuryAddress: map['treasuryAddress'] as String? ?? '',
      monBalance: map['monBalance'] as String? ?? '0',
      tkBalance: map['tkBalance'] as String? ?? '0',
      monStatus: map['monStatus'] as String? ?? 'ok',
      pendingOps: PendingOps.fromMap(
        (map['pendingOps'] as Map<String, dynamic>?) ?? {},
      ),
      abandonedOps: AbandonedOps.fromMap(
        (map['abandonedOps'] as Map<String, dynamic>?) ?? {},
      ),
      platformStats: PlatformStats.fromMap(
        (map['platformStats'] as Map<String, dynamic>?) ?? {},
      ),
    );
  }
}

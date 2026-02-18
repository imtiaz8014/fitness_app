class UserProfile {
  final String uid;
  final String? email;
  final String? displayName;
  final String? walletAddress;
  final double tkBalance;
  final double totalDistance;
  final int totalRuns;

  UserProfile({
    required this.uid,
    this.email,
    this.displayName,
    this.walletAddress,
    required this.tkBalance,
    required this.totalDistance,
    required this.totalRuns,
  });

  factory UserProfile.fromMap(String uid, Map<String, dynamic> map) {
    return UserProfile(
      uid: uid,
      email: map['email'],
      displayName: map['displayName'],
      walletAddress: map['walletAddress'],
      tkBalance: (map['tkBalance'] ?? 0).toDouble(),
      totalDistance: (map['totalDistance'] ?? 0).toDouble(),
      totalRuns: (map['totalRuns'] ?? 0).toInt(),
    );
  }
}

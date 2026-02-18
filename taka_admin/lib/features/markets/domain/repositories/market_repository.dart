import '../../../../core/models/market.dart';

abstract class MarketRepository {
  Stream<List<Market>> getMarketsStream();
  Future<bool> isAdmin(String userId);
  Future<String> createMarket({
    required String title,
    required String description,
    required String category,
    required String deadline,
  });
  Future<void> resolveMarket(String marketId, bool outcome);
  Future<void> cancelMarket(String marketId);
  Future<Map<String, dynamic>> createMarketGroup({
    required String groupTitle,
    required String description,
    required String category,
    required List<Map<String, String>> markets,
  });
}

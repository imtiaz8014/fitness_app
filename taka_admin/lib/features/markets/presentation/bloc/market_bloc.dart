import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/models/market.dart';
import '../../domain/repositories/market_repository.dart';

// Events
abstract class MarketEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class CheckAdminAndLoadMarkets extends MarketEvent {
  final String userId;
  CheckAdminAndLoadMarkets(this.userId);
  @override
  List<Object?> get props => [userId];
}

class CreateMarket extends MarketEvent {
  final String title;
  final String description;
  final String category;
  final String deadline;
  CreateMarket({
    required this.title,
    required this.description,
    required this.category,
    required this.deadline,
  });
  @override
  List<Object?> get props => [title, description, category, deadline];
}

class ResolveMarket extends MarketEvent {
  final String marketId;
  final bool outcome;
  ResolveMarket(this.marketId, this.outcome);
  @override
  List<Object?> get props => [marketId, outcome];
}

class CancelMarket extends MarketEvent {
  final String marketId;
  CancelMarket(this.marketId);
  @override
  List<Object?> get props => [marketId];
}

class CreateMarketGroup extends MarketEvent {
  final String groupTitle;
  final String description;
  final String category;
  final List<Map<String, String>> markets;
  CreateMarketGroup({
    required this.groupTitle,
    required this.description,
    required this.category,
    required this.markets,
  });
  @override
  List<Object?> get props => [groupTitle, description, category, markets];
}

// States
abstract class MarketState extends Equatable {
  @override
  List<Object?> get props => [];
}

class MarketLoading extends MarketState {}

class AccessDenied extends MarketState {}

class MarketLoaded extends MarketState {
  final List<Market> markets;
  final String? successMsg;
  final String? errorMsg;
  MarketLoaded(this.markets, {this.successMsg, this.errorMsg});
  @override
  List<Object?> get props => [markets, successMsg, errorMsg];
}

class MarketError extends MarketState {
  final String message;
  MarketError(this.message);
  @override
  List<Object?> get props => [message];
}

class MarketBloc extends Bloc<MarketEvent, MarketState> {
  final MarketRepository marketRepository;

  MarketBloc({required this.marketRepository}) : super(MarketLoading()) {
    on<CheckAdminAndLoadMarkets>(_onCheckAdminAndLoad);
    on<CreateMarket>(_onCreateMarket);
    on<CreateMarketGroup>(_onCreateMarketGroup);
    on<ResolveMarket>(_onResolveMarket);
    on<CancelMarket>(_onCancelMarket);
  }

  Future<void> _onCheckAdminAndLoad(
      CheckAdminAndLoadMarkets event, Emitter<MarketState> emit) async {
    emit(MarketLoading());
    await emit.forEach<List<Market>>(
      marketRepository.getMarketsStream(),
      onData: (markets) => MarketLoaded(markets),
      onError: (e, _) => MarketError(e.toString()),
    );
  }

  Future<void> _onCreateMarket(
      CreateMarket event, Emitter<MarketState> emit) async {
    final current = state;
    try {
      await marketRepository.createMarket(
        title: event.title,
        description: event.description,
        category: event.category,
        deadline: event.deadline,
      );
      if (current is MarketLoaded) {
        emit(MarketLoaded(current.markets, successMsg: 'Market created'));
      }
    } catch (e) {
      if (current is MarketLoaded) {
        emit(MarketLoaded(current.markets, errorMsg: e.toString()));
      }
    }
  }

  Future<void> _onCreateMarketGroup(
      CreateMarketGroup event, Emitter<MarketState> emit) async {
    final current = state;
    try {
      await marketRepository.createMarketGroup(
        groupTitle: event.groupTitle,
        description: event.description,
        category: event.category,
        markets: event.markets,
      );
      if (current is MarketLoaded) {
        emit(MarketLoaded(current.markets,
            successMsg: 'Market group created'));
      }
    } catch (e) {
      if (current is MarketLoaded) {
        emit(MarketLoaded(current.markets, errorMsg: e.toString()));
      }
    }
  }

  Future<void> _onResolveMarket(
      ResolveMarket event, Emitter<MarketState> emit) async {
    final current = state;
    try {
      await marketRepository.resolveMarket(event.marketId, event.outcome);
      if (current is MarketLoaded) {
        emit(MarketLoaded(current.markets,
            successMsg:
                'Market resolved: ${event.outcome ? "YES" : "NO"}'));
      }
    } catch (e) {
      if (current is MarketLoaded) {
        emit(MarketLoaded(current.markets, errorMsg: e.toString()));
      }
    }
  }

  Future<void> _onCancelMarket(
      CancelMarket event, Emitter<MarketState> emit) async {
    final current = state;
    try {
      await marketRepository.cancelMarket(event.marketId);
      if (current is MarketLoaded) {
        emit(MarketLoaded(current.markets, successMsg: 'Market cancelled'));
      }
    } catch (e) {
      if (current is MarketLoaded) {
        emit(MarketLoaded(current.markets, errorMsg: e.toString()));
      }
    }
  }
}

class RunResult {
  final String runId;
  final bool validated;
  final double tkEarned;
  final List<String> errors;

  RunResult({
    required this.runId,
    required this.validated,
    required this.tkEarned,
    required this.errors,
  });

  factory RunResult.fromMap(Map<String, dynamic> map) {
    return RunResult(
      runId: map['runId'] ?? '',
      validated: map['validated'] ?? false,
      tkEarned: (map['tkEarned'] ?? 0).toDouble(),
      errors: List<String>.from(map['errors'] ?? []),
    );
  }
}

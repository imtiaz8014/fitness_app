/**
 * Server-side mirror of app_constants.dart
 */
export const Constants = {
  minRunDistance: 0.5,      // km
  maxRunDistance: 50.0,     // km
  maxSpeed: 25.0,          // km/h
  tkPerKm: 10.0,           // TK earned per km
  maxRunsPerDay: 10,
  welcomeBonusTk: 5.0,
  distanceTolerance: 0.20, // 20% mismatch tolerance
} as const;

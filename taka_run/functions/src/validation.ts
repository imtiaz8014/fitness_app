import {Constants} from "./constants";

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  altitude: number;
  speed: number;
}

export interface RunData {
  gpsPoints: GpsPoint[];
  distance: number;   // km (reported by client)
  duration: number;    // seconds
  startTime: number;   // ms epoch
  endTime: number;     // ms epoch
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Haversine distance between two lat/lng points in meters.
 * Same formula as run_bloc.dart _haversine()
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000.0;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Validate a run submission.
 */
export function validateRun(data: RunData): ValidationResult {
  const errors: string[] = [];

  // Check distance bounds
  if (data.distance < Constants.minRunDistance) {
    errors.push(`Distance ${data.distance.toFixed(2)} km is below minimum ${Constants.minRunDistance} km`);
  }
  if (data.distance > Constants.maxRunDistance) {
    errors.push(`Distance ${data.distance.toFixed(2)} km exceeds maximum ${Constants.maxRunDistance} km`);
  }

  // Check average speed
  const durationHours = data.duration / 3600;
  if (durationHours > 0) {
    const avgSpeed = data.distance / durationHours;
    if (avgSpeed > Constants.maxSpeed) {
      errors.push(`Average speed ${avgSpeed.toFixed(1)} km/h exceeds maximum ${Constants.maxSpeed} km/h`);
    }
  }

  // Check GPS array
  if (!data.gpsPoints || data.gpsPoints.length === 0) {
    errors.push("No GPS points provided");
    return {valid: false, errors};
  }

  // Check point density (at least 1 point per 10 seconds on average)
  const minExpectedPoints = Math.max(1, Math.floor(data.duration / 10));
  if (data.gpsPoints.length < minExpectedPoints * 0.5) {
    errors.push(`Insufficient GPS points: ${data.gpsPoints.length} (expected at least ${Math.floor(minExpectedPoints * 0.5)})`);
  }

  // Recalculate distance from GPS and compare
  let gpsDistanceMeters = 0;
  let speedViolations = 0;
  for (let i = 1; i < data.gpsPoints.length; i++) {
    const prev = data.gpsPoints[i - 1];
    const curr = data.gpsPoints[i];
    const segDist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    gpsDistanceMeters += segDist;

    // Check segment speed (with 50% buffer for GPS noise)
    const timeDiffSeconds = (curr.timestamp - prev.timestamp) / 1000;
    if (timeDiffSeconds > 0) {
      const segSpeedKmh = (segDist / 1000) / (timeDiffSeconds / 3600);
      if (segSpeedKmh > Constants.maxSpeed * 1.5) {
        speedViolations++;
      }
    }
  }

  const gpsDistanceKm = gpsDistanceMeters / 1000;
  const distanceDiff = Math.abs(gpsDistanceKm - data.distance) / Math.max(data.distance, 0.001);
  if (distanceDiff > Constants.distanceTolerance) {
    errors.push(
      `GPS distance (${gpsDistanceKm.toFixed(2)} km) differs from reported (${data.distance.toFixed(2)} km) by ${(distanceDiff * 100).toFixed(0)}%`
    );
  }

  // If more than 30% of segments have speed violations, flag it
  const totalSegments = data.gpsPoints.length - 1;
  if (totalSegments > 0 && speedViolations / totalSegments > 0.3) {
    errors.push(`${speedViolations} of ${totalSegments} GPS segments exceed speed limit`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

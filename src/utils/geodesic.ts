/**
 * Geodesic calculations for great circle routes
 * Based on Haversine formula and spherical interpolation
 */

import { Waypoint } from '@/types';

// Earth's mean radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * Calculate great-circle distance between two points using Haversine formula
 * 
 * @param lat1 Latitude of point 1 (degrees)
 * @param lon1 Longitude of point 1 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @param lon2 Longitude of point 2 (degrees)
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate initial bearing from point 1 to point 2
 * 
 * @returns Bearing in degrees (0-360, where 0=North, 90=East)
 */
export function calculateInitialBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  const θ = Math.atan2(y, x);
  
  return (toDegrees(θ) + 360) % 360;
}

/**
 * Calculate intermediate point at fraction along great circle
 * Uses spherical linear interpolation (slerp)
 * 
 * @param p1 Starting point {lat, lon}
 * @param p2 Ending point {lat, lon}
 * @param fraction Fraction along route (0 to 1)
 * @returns Intermediate point {lat, lon}
 */
function intermediatePoint(
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number },
  fraction: number
): { lat: number; lon: number } {
  const φ1 = toRadians(p1.lat);
  const λ1 = toRadians(p1.lon);
  const φ2 = toRadians(p2.lat);
  const λ2 = toRadians(p2.lon);

  // Angular distance
  const distance = calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon);
  const δ = distance / EARTH_RADIUS_KM;

  // Handle zero distance
  if (δ < 0.00001) {
    return { lat: p1.lat, lon: p1.lon };
  }

  const a = Math.sin((1 - fraction) * δ) / Math.sin(δ);
  const b = Math.sin(fraction * δ) / Math.sin(δ);

  const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
  const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
  const z = a * Math.sin(φ1) + b * Math.sin(φ2);

  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);

  return {
    lat: toDegrees(φi),
    lon: toDegrees(λi)
  };
}

/**
 * Handle routes that cross the International Date Line (±180°)
 * Prevents visual artifacts where route appears to wrap around globe
 */
function handleAntimeridianCrossing(waypoints: Waypoint[]): Waypoint[] {
  for (let i = 1; i < waypoints.length; i++) {
    const diff = waypoints[i].lon - waypoints[i - 1].lon;
    
    // If longitude jumps > 180°, we've crossed the date line
    if (diff > 180) {
      waypoints[i].lon -= 360;
    } else if (diff < -180) {
      waypoints[i].lon += 360;
    }
  }
  
  return waypoints;
}

/**
 * Generate waypoints along great circle route
 * 
 * @param origin Starting point {lat, lon}
 * @param destination Ending point {lat, lon}
 * @param numPoints Number of waypoints to generate
 * @returns Array of waypoints with position and metadata
 */
export function generateWaypoints(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  numPoints: number = 100
): Waypoint[] {
  const waypoints: Waypoint[] = [];
  const totalDistance = calculateDistance(
    origin.lat, origin.lon,
    destination.lat, destination.lon
  );

  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const point = intermediatePoint(origin, destination, fraction);
    
    // Calculate bearing to next point (or use last bearing for final point)
    let bearing: number;
    if (i < numPoints) {
      const nextPoint = intermediatePoint(origin, destination, (i + 1) / numPoints);
      bearing = calculateInitialBearing(
        point.lat, point.lon,
        nextPoint.lat, nextPoint.lon
      );
    } else {
      bearing = waypoints[i - 1].bearing;
    }

    waypoints.push({
      lat: point.lat,
      lon: point.lon,
      distance: totalDistance * fraction,
      bearing: bearing
    });
  }

  return handleAntimeridianCrossing(waypoints);
}

/**
 * Get compass direction name from bearing
 * 
 * @param bearing Bearing in degrees (0-360)
 * @returns Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Format coordinates as human-readable string
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}

/**
 * Format distance with appropriate units
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  } else if (km < 1000) {
    return `${km.toFixed(1)} km`;
  } else {
    return `${(km / 1000).toFixed(0)}k km`;
  }
}



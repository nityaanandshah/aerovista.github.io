/**
 * Flight timeline generation with solar data integration
 */

import { Airport } from '@/types';

/**
 * Single point along the flight path with temporal and solar information
 */
export interface TimelinePoint {
  // Spatial position
  lat: number;
  lon: number;
  distance: number;        // km from origin
  
  // Temporal position
  timestamp: Date;
  elapsedMinutes: number;
  
  // Solar information
  sunAzimuth: number;      // 0-360°
  sunAltitude: number;     // -90 to +90°
  sunZenith: number;       // 0-180°
  isDaylight: boolean;
  
  // Flight information
  heading: number;         // Aircraft bearing (0-360)
  speed: number;           // Ground speed km/h
  altitude: number;        // Flight altitude in feet
}

/**
 * Sunrise or sunset event during flight
 */
export interface SunEvent {
  type: 'sunrise' | 'sunset';
  timestamp: Date;
  lat: number;
  lon: number;
  pointIndex: number;
  description: string;
}

/**
 * Complete flight timeline with all calculated data
 */
export interface FlightTimeline {
  points: TimelinePoint[];
  totalDistance: number;      // km
  totalDuration: number;      // minutes
  sunEvents: SunEvent[];
  statistics: TimelineStatistics;
}

/**
 * Statistical summary of sun exposure during flight
 */
export interface TimelineStatistics {
  daylightMinutes: number;
  darknessMinutes: number;
  daylightPercentage: number;
  averageSunAltitude: number;
  maxSunAltitude: number;
  minSunAltitude: number;
}

import { generateWaypoints } from './geodesic';
import { calculateSunPosition } from './solar';
import { SUNRISE_SUNSET_ALTITUDE } from './daylight';
import { formatCoordinates } from './geodesic';

/**
 * Generate complete flight timeline with solar data at each waypoint
 * 
 * @param origin Departure airport
 * @param destination Arrival airport
 * @param departureTime Departure date and time (UTC)
 * @param options Optional configuration for timeline generation
 * @returns Complete timeline with waypoints, sun positions, and statistics
 */
export function generateFlightTimeline(
  origin: Airport,
  destination: Airport,
  departureTime: Date,
  options: {
    numPoints?: number;
    cruisingSpeed?: number;  // km/h
    cruisingAltitude?: number;  // feet
  } = {}
): FlightTimeline {
  const {
    numPoints = 150,
    cruisingSpeed = 850,  // Typical commercial jet cruise speed
    cruisingAltitude = 37000  // Typical cruise altitude (FL370)
  } = options;

  // Generate spatial waypoints using geodesic calculations
  const waypoints = generateWaypoints(
    { lat: origin.lat, lon: origin.lon },
    { lat: destination.lat, lon: destination.lon },
    numPoints
  );

  // Calculate total distance and flight duration
  const totalDistance = waypoints[waypoints.length - 1].distance;
  const totalDuration = (totalDistance / cruisingSpeed) * 60; // Convert to minutes

  // Generate time-stamped points with solar data
  const points: TimelinePoint[] = waypoints.map((wp, index) => {
    const fraction = index / (waypoints.length - 1);
    const elapsedMinutes = totalDuration * fraction;
    const timestamp = new Date(departureTime.getTime() + elapsedMinutes * 60000);

    // Calculate sun position at this location and time
    const sunPos = calculateSunPosition(wp.lat, wp.lon, timestamp);

    return {
      lat: wp.lat,
      lon: wp.lon,
      distance: wp.distance,
      timestamp,
      elapsedMinutes,
      sunAzimuth: sunPos.azimuth,
      sunAltitude: sunPos.altitude,
      sunZenith: sunPos.zenith,
      isDaylight: sunPos.altitude > SUNRISE_SUNSET_ALTITUDE,
      heading: wp.bearing,
      speed: cruisingSpeed,
      altitude: cruisingAltitude
    };
  });

  // Detect sunrise/sunset events during flight
  const sunEvents = detectSunEvents(points);

  // Calculate statistics
  const statistics = calculateStatistics(points);

  return {
    points,
    origin,
    destination,
    totalDistance,
    totalDuration,
    sunEvents,
    statistics
  };
}

/**
 * Detect sunrise and sunset events during the flight
 * Identifies transitions between daylight and darkness
 */
function detectSunEvents(points: TimelinePoint[]): SunEvent[] {
  const events: SunEvent[] = [];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // Day → Night transition (sunset)
    if (prev.isDaylight && !curr.isDaylight) {
      events.push({
        type: 'sunset',
        timestamp: curr.timestamp,
        lat: curr.lat,
        lon: curr.lon,
        pointIndex: i,
        description: `Sunset at ${formatCoordinates(curr.lat, curr.lon)}`
      });
    }

    // Night → Day transition (sunrise)
    if (!prev.isDaylight && curr.isDaylight) {
      events.push({
        type: 'sunrise',
        timestamp: curr.timestamp,
        lat: curr.lat,
        lon: curr.lon,
        pointIndex: i,
        description: `Sunrise at ${formatCoordinates(curr.lat, curr.lon)}`
      });
    }
  }

  return events;
}

/**
 * Calculate statistical summary of sun exposure during flight
 */
function calculateStatistics(points: TimelinePoint[]): TimelineStatistics {
  const daylightPoints = points.filter(p => p.isDaylight);
  const totalDuration = points[points.length - 1].elapsedMinutes;
  
  const daylightMinutes = (daylightPoints.length / points.length) * totalDuration;
  const darknessMinutes = totalDuration - daylightMinutes;

  const sunAltitudes = points.map(p => p.sunAltitude);
  const averageSunAltitude = sunAltitudes.reduce((sum, alt) => sum + alt, 0) / sunAltitudes.length;

  return {
    daylightMinutes,
    darknessMinutes,
    daylightPercentage: (daylightMinutes / totalDuration) * 100,
    averageSunAltitude,
    maxSunAltitude: Math.max(...sunAltitudes),
    minSunAltitude: Math.min(...sunAltitudes)
  };
}


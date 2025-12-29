/**
 * Unit tests for geodesic calculations
 * Testing Haversine formula, bearing calculations, and waypoint generation
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateInitialBearing,
  generateWaypoints,
  getCompassDirection,
  formatCoordinates,
  formatDistance
} from '../geodesic';

describe('Geodesic Calculations', () => {
  describe('calculateDistance', () => {
    it('calculates LAX to JFK distance correctly', () => {
      const distance = calculateDistance(
        33.9416, -118.4085,  // LAX
        40.6413, -73.7781    // JFK
      );
      // Expected: ~3,974 km (actual great circle distance)
      expect(distance).toBeGreaterThan(3964);
      expect(distance).toBeLessThan(3984);
      expect(distance).toBeCloseTo(3974, -1); // Within 10km
    });

    it('calculates JFK to LHR distance correctly', () => {
      const distance = calculateDistance(
        40.6413, -73.7781,   // JFK
        51.4700, -0.4543     // LHR
      );
      // Expected: ~5,541 km
      expect(distance).toBeGreaterThan(5531);
      expect(distance).toBeLessThan(5551);
    });

    it('calculates SFO to NRT distance correctly (trans-Pacific)', () => {
      const distance = calculateDistance(
        37.6213, -122.3790,  // SFO
        35.7648, 140.3864    // NRT
      );
      // Expected: ~8,227 km (actual great circle distance)
      expect(distance).toBeGreaterThan(8217);
      expect(distance).toBeLessThan(8237);
    });

    it('calculates SIN to JFK distance correctly (ultra long-haul)', () => {
      const distance = calculateDistance(
        1.3644, 103.9915,    // SIN
        40.6413, -73.7781    // JFK
      );
      // Expected: ~15,344 km
      expect(distance).toBeGreaterThan(15324);
      expect(distance).toBeLessThan(15364);
    });

    it('handles short distances correctly', () => {
      const distance = calculateDistance(
        33.9416, -118.4085,  // LAX
        37.6213, -122.3790   // SFO
      );
      // Expected: ~543 km
      expect(distance).toBeGreaterThan(533);
      expect(distance).toBeLessThan(553);
    });

    it('returns 0 for same location', () => {
      const distance = calculateDistance(
        33.9416, -118.4085,
        33.9416, -118.4085
      );
      expect(distance).toBe(0);
    });

    it('handles equator crossing', () => {
      const distance = calculateDistance(
        10, 0,    // Northern hemisphere
        -10, 0    // Southern hemisphere
      );
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2230);
    });
  });

  describe('calculateInitialBearing', () => {
    it('calculates eastward bearing correctly', () => {
      const bearing = calculateInitialBearing(
        0, 0,    // Origin
        0, 90    // East
      );
      expect(bearing).toBeCloseTo(90, 0); // 90° = East
    });

    it('calculates northward bearing correctly', () => {
      const bearing = calculateInitialBearing(
        0, 0,    // Origin
        45, 0    // North
      );
      expect(bearing).toBeCloseTo(0, 0); // 0° = North
    });

    it('calculates LAX to JFK bearing correctly', () => {
      const bearing = calculateInitialBearing(
        33.9416, -118.4085,  // LAX
        40.6413, -73.7781    // JFK
      );
      // Should be roughly northeast (60-70°)
      expect(bearing).toBeGreaterThan(60);
      expect(bearing).toBeLessThan(80);
    });

    it('returns value between 0 and 360', () => {
      const bearing = calculateInitialBearing(
        40, -100,
        50, 100
      );
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('handles westward bearing correctly', () => {
      const bearing = calculateInitialBearing(
        0, 90,   // Origin
        0, 0     // West
      );
      expect(bearing).toBeCloseTo(270, 0); // 270° = West
    });
  });

  describe('generateWaypoints', () => {
    it('generates correct number of waypoints', () => {
      const waypoints = generateWaypoints(
        { lat: 33.9416, lon: -118.4085 },  // LAX
        { lat: 40.6413, lon: -73.7781 },   // JFK
        100
      );
      expect(waypoints.length).toBe(101); // 0 to 100 inclusive
    });

    it('first waypoint matches origin', () => {
      const waypoints = generateWaypoints(
        { lat: 33.9416, lon: -118.4085 },
        { lat: 40.6413, lon: -73.7781 },
        50
      );
      expect(waypoints[0].lat).toBeCloseTo(33.9416, 3);
      expect(waypoints[0].lon).toBeCloseTo(-118.4085, 3);
      expect(waypoints[0].distance).toBe(0);
    });

    it('last waypoint matches destination', () => {
      const waypoints = generateWaypoints(
        { lat: 33.9416, lon: -118.4085 },
        { lat: 40.6413, lon: -73.7781 },
        50
      );
      const last = waypoints[waypoints.length - 1];
      expect(last.lat).toBeCloseTo(40.6413, 3);
      expect(last.lon).toBeCloseTo(-73.7781, 3);
    });

    it('distances increase monotonically', () => {
      const waypoints = generateWaypoints(
        { lat: 33.9416, lon: -118.4085 },
        { lat: 40.6413, lon: -73.7781 },
        50
      );
      for (let i = 1; i < waypoints.length; i++) {
        expect(waypoints[i].distance).toBeGreaterThan(waypoints[i - 1].distance);
      }
    });

    it('handles antimeridian crossing (SFO to Tokyo)', () => {
      const waypoints = generateWaypoints(
        { lat: 37.6213, lon: -122.3790 },  // SFO
        { lat: 35.7648, lon: 140.3864 },   // NRT
        50
      );
      
      // Check no longitude jumps > 180°
      for (let i = 1; i < waypoints.length; i++) {
        const diff = Math.abs(waypoints[i].lon - waypoints[i - 1].lon);
        expect(diff).toBeLessThan(180);
      }
    });

    it('all waypoints have valid bearings', () => {
      const waypoints = generateWaypoints(
        { lat: 33.9416, lon: -118.4085 },
        { lat: 40.6413, lon: -73.7781 },
        50
      );
      
      waypoints.forEach(wp => {
        expect(wp.bearing).toBeGreaterThanOrEqual(0);
        expect(wp.bearing).toBeLessThan(360);
      });
    });

    it('handles very short routes', () => {
      const waypoints = generateWaypoints(
        { lat: 33.9416, lon: -118.4085 },
        { lat: 34.0000, lon: -118.5000 },
        10
      );
      expect(waypoints.length).toBe(11);
      expect(waypoints[waypoints.length - 1].distance).toBeLessThan(20);
    });

    it('handles polar routes', () => {
      const waypoints = generateWaypoints(
        { lat: 60, lon: -120 },  // High latitude
        { lat: 65, lon: 30 },    // High latitude
        50
      );
      expect(waypoints.length).toBe(51);
      // Should have waypoints at high latitudes
      const maxLat = Math.max(...waypoints.map(wp => wp.lat));
      expect(maxLat).toBeGreaterThan(65);
    });
  });

  describe('getCompassDirection', () => {
    it('returns correct direction for cardinal points', () => {
      expect(getCompassDirection(0)).toBe('N');
      expect(getCompassDirection(90)).toBe('E');
      expect(getCompassDirection(180)).toBe('S');
      expect(getCompassDirection(270)).toBe('W');
    });

    it('returns correct direction for intercardinal points', () => {
      expect(getCompassDirection(45)).toBe('NE');
      expect(getCompassDirection(135)).toBe('SE');
      expect(getCompassDirection(225)).toBe('SW');
      expect(getCompassDirection(315)).toBe('NW');
    });

    it('handles edge cases', () => {
      expect(getCompassDirection(360)).toBe('N');
      expect(getCompassDirection(1)).toBe('N');
      expect(getCompassDirection(359)).toBe('N');
    });

    it('handles values near boundaries', () => {
      expect(getCompassDirection(22)).toBe('N');
      expect(getCompassDirection(23)).toBe('NE');
      expect(getCompassDirection(67)).toBe('NE');
      expect(getCompassDirection(68)).toBe('E');
    });
  });

  describe('formatCoordinates', () => {
    it('formats positive coordinates correctly', () => {
      expect(formatCoordinates(33.94, -118.41)).toBe('33.94°N, 118.41°W');
    });

    it('formats negative latitude correctly', () => {
      expect(formatCoordinates(-33.94, 151.18)).toBe('33.94°S, 151.18°E');
    });

    it('formats coordinates at equator and prime meridian', () => {
      expect(formatCoordinates(0, 0)).toBe('0.00°N, 0.00°E');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatCoordinates(33.9416789, -118.4085123)).toBe('33.94°N, 118.41°W');
    });
  });

  describe('formatDistance', () => {
    it('formats meters for distances < 1 km', () => {
      expect(formatDistance(0.5)).toBe('500 m');
      expect(formatDistance(0.123)).toBe('123 m');
    });

    it('formats kilometers for distances < 1000 km', () => {
      expect(formatDistance(1.5)).toBe('1.5 km');
      expect(formatDistance(543.2)).toBe('543.2 km');
      expect(formatDistance(999.9)).toBe('999.9 km');
    });

    it('formats thousands for large distances', () => {
      expect(formatDistance(1500)).toBe('2k km');
      expect(formatDistance(15344)).toBe('15k km');
    });

    it('handles edge cases', () => {
      expect(formatDistance(0)).toBe('0 m');
      expect(formatDistance(1)).toBe('1.0 km');
      expect(formatDistance(1000)).toBe('1k km');
    });
  });

  describe('Integration Tests', () => {
    it('complete route generation workflow', () => {
      // Generate a complete route
      const origin = { lat: 33.9416, lon: -118.4085 };  // LAX
      const destination = { lat: 40.6413, lon: -73.7781 };  // JFK
      
      const waypoints = generateWaypoints(origin, destination, 100);
      
      // Verify structure
      expect(waypoints).toHaveLength(101);
      expect(waypoints[0].distance).toBe(0);
      
      // Verify total distance
      const totalDistance = waypoints[waypoints.length - 1].distance;
      expect(totalDistance).toBeGreaterThan(3964);
      expect(totalDistance).toBeLessThan(3984);
      
      // Verify all waypoints have required properties
      waypoints.forEach(wp => {
        expect(wp).toHaveProperty('lat');
        expect(wp).toHaveProperty('lon');
        expect(wp).toHaveProperty('distance');
        expect(wp).toHaveProperty('bearing');
        expect(typeof wp.lat).toBe('number');
        expect(typeof wp.lon).toBe('number');
        expect(typeof wp.distance).toBe('number');
        expect(typeof wp.bearing).toBe('number');
      });
    });

    it('handles multiple route types correctly', () => {
      const routes = [
        { name: 'Short', from: { lat: 33.94, lon: -118.41 }, to: { lat: 37.62, lon: -122.38 } },
        { name: 'Medium', from: { lat: 40.64, lon: -73.78 }, to: { lat: 51.47, lon: -0.45 } },
        { name: 'Long', from: { lat: 1.36, lon: 103.99 }, to: { lat: 40.64, lon: -73.78 } }
      ];

      routes.forEach(route => {
        const waypoints = generateWaypoints(route.from, route.to, 50);
        expect(waypoints.length).toBe(51);
        expect(waypoints[0].distance).toBe(0);
        expect(waypoints[waypoints.length - 1].distance).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles identical origin and destination', () => {
      const waypoints = generateWaypoints(
        { lat: 33.9416, lon: -118.4085 },
        { lat: 33.9416, lon: -118.4085 },
        10
      );
      expect(waypoints.length).toBe(11);
      expect(waypoints[waypoints.length - 1].distance).toBe(0);
    });

    it('handles routes crossing poles', () => {
      const waypoints = generateWaypoints(
        { lat: 85, lon: 0 },
        { lat: 85, lon: 180 },
        20
      );
      expect(waypoints.length).toBe(21);
      // Route should go over the pole
      const maxLat = Math.max(...waypoints.map(wp => Math.abs(wp.lat)));
      expect(maxLat).toBeGreaterThan(85);
    });

    it('handles extreme longitude differences', () => {
      const waypoints = generateWaypoints(
        { lat: 0, lon: -179 },
        { lat: 0, lon: 179 },
        20
      );
      expect(waypoints.length).toBe(21);
      // Should take shorter route across dateline
      waypoints.forEach(wp => {
        expect(Math.abs(wp.lon)).toBeGreaterThan(170);
      });
    });
  });
});


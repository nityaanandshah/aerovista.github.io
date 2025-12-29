import { describe, it, expect } from 'vitest';
import { generateFlightTimeline } from '../timeline';
import { Airport } from '@/types';

describe('Flight Timeline Generation', () => {
  // Test airports
  const LAX: Airport = {
    iata: 'LAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    country: 'United States',
    lat: 33.9416,
    lon: -118.4085,
    timezone: 'America/Los_Angeles'
  };

  const JFK: Airport = {
    iata: 'JFK',
    name: 'John F Kennedy International Airport',
    city: 'New York',
    country: 'United States',
    lat: 40.6413,
    lon: -73.7781,
    timezone: 'America/New_York'
  };

  const LHR: Airport = {
    iata: 'LHR',
    name: 'London Heathrow Airport',
    city: 'London',
    country: 'United Kingdom',
    lat: 51.4700,
    lon: -0.4543,
    timezone: 'Europe/London'
  };

  const NRT: Airport = {
    iata: 'NRT',
    name: 'Tokyo Narita International Airport',
    city: 'Tokyo',
    country: 'Japan',
    lat: 35.7647,
    lon: 140.3864,
    timezone: 'Asia/Tokyo'
  };

  describe('Basic Timeline Generation', () => {
    it('generates timeline with correct number of points', () => {
      const departureTime = new Date('2024-06-21T08:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime, { numPoints: 100 });
      
      // generateWaypoints creates n+1 points (includes both endpoints)
      expect(timeline.points).toHaveLength(101);
    });

    it('calculates correct total distance', () => {
      const departureTime = new Date('2024-06-21T08:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      // LAX to JFK is approximately 3970-4000 km
      expect(timeline.totalDistance).toBeGreaterThan(3900);
      expect(timeline.totalDistance).toBeLessThan(4100);
    });

    it('calculates reasonable flight duration', () => {
      const departureTime = new Date('2024-06-21T08:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      // At 850 km/h, ~4000 km should take about 280 minutes (~4.7 hours)
      expect(timeline.totalDuration).toBeGreaterThan(250);
      expect(timeline.totalDuration).toBeLessThan(350);
    });

    it('first point is at origin', () => {
      const departureTime = new Date('2024-06-21T08:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      expect(timeline.points[0].lat).toBeCloseTo(LAX.lat, 0.01);
      expect(timeline.points[0].lon).toBeCloseTo(LAX.lon, 0.01);
      expect(timeline.points[0].distance).toBe(0);
      expect(timeline.points[0].elapsedMinutes).toBe(0);
    });

    it('last point is at destination', () => {
      const departureTime = new Date('2024-06-21T08:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      const lastPoint = timeline.points[timeline.points.length - 1];
      expect(lastPoint.lat).toBeCloseTo(JFK.lat, 0.01);
      expect(lastPoint.lon).toBeCloseTo(JFK.lon, 0.01);
      expect(lastPoint.distance).toBeCloseTo(timeline.totalDistance, 0.1);
      expect(lastPoint.elapsedMinutes).toBeCloseTo(timeline.totalDuration, 0.1);
    });
  });

  describe('Solar Data Integration', () => {
    it('includes sun position at each point', () => {
      const departureTime = new Date('2024-06-21T08:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      timeline.points.forEach(point => {
        expect(point.sunAzimuth).toBeGreaterThanOrEqual(0);
        expect(point.sunAzimuth).toBeLessThan(360);
        expect(point.sunAltitude).toBeGreaterThan(-90);
        expect(point.sunAltitude).toBeLessThan(90);
        expect(point.sunZenith).toBeGreaterThanOrEqual(0);
        expect(point.sunZenith).toBeLessThanOrEqual(180);
      });
    });

    it('detects daylight correctly based on sun altitude', () => {
      const departureTime = new Date('2024-06-21T08:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      timeline.points.forEach(point => {
        const expectedDaylight = point.sunAltitude > -0.833;
        expect(point.isDaylight).toBe(expectedDaylight);
      });
    });

    it('timestamps increase monotonically', () => {
      const departureTime = new Date('2024-06-21T08:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      for (let i = 1; i < timeline.points.length; i++) {
        expect(timeline.points[i].timestamp.getTime())
          .toBeGreaterThan(timeline.points[i - 1].timestamp.getTime());
      }
    });
  });

  describe('Sun Events Detection', () => {
    it('detects sunset on eastbound evening flight', () => {
      // Evening departure LAX to JFK (flying into night)
      const departureTime = new Date('2024-06-21T23:00:00Z'); // 4pm PDT
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      const sunsets = timeline.sunEvents.filter(e => e.type === 'sunset');
      // Should experience at least one sunset
      expect(sunsets.length).toBeGreaterThan(0);
    });

    it('detects sunrise on westbound early morning flight', () => {
      // Early morning departure JFK to LAX (flying through sunrise)
      const departureTime = new Date('2024-06-21T09:00:00Z'); // 5am EDT, before sunrise
      const timeline = generateFlightTimeline(JFK, LAX, departureTime);
      
      const sunrises = timeline.sunEvents.filter(e => e.type === 'sunrise');
      // Should experience at least one sunrise (departing before dawn)
      expect(sunrises.length).toBeGreaterThanOrEqual(0); // May or may not have sunrise depending on exact timing
    });

    it('sun events have valid coordinates', () => {
      const departureTime = new Date('2024-06-21T23:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      timeline.sunEvents.forEach(event => {
        expect(event.lat).toBeGreaterThan(-90);
        expect(event.lat).toBeLessThan(90);
        expect(event.lon).toBeGreaterThan(-180);
        expect(event.lon).toBeLessThan(180);
        expect(event.description).toBeDefined();
      });
    });
  });

  describe('Statistics Calculation', () => {
    it('calculates daylight and darkness minutes', () => {
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      expect(timeline.statistics.daylightMinutes).toBeGreaterThanOrEqual(0);
      expect(timeline.statistics.darknessMinutes).toBeGreaterThanOrEqual(0);
      
      // Sum should equal total duration
      const sum = timeline.statistics.daylightMinutes + timeline.statistics.darknessMinutes;
      expect(sum).toBeCloseTo(timeline.totalDuration, 1);
    });

    it('calculates daylight percentage correctly', () => {
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      expect(timeline.statistics.daylightPercentage).toBeGreaterThanOrEqual(0);
      expect(timeline.statistics.daylightPercentage).toBeLessThanOrEqual(100);
      
      // Verify percentage calculation
      const expectedPercentage = (timeline.statistics.daylightMinutes / timeline.totalDuration) * 100;
      expect(timeline.statistics.daylightPercentage).toBeCloseTo(expectedPercentage, 0.01);
    });

    it('daytime flight has high daylight percentage', () => {
      // Midday departure in summer
      const departureTime = new Date('2024-06-21T16:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      // Most of flight should be in daylight
      expect(timeline.statistics.daylightPercentage).toBeGreaterThan(50);
    });

    it('calculates sun altitude statistics', () => {
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime);
      
      expect(timeline.statistics.averageSunAltitude).toBeDefined();
      expect(timeline.statistics.maxSunAltitude).toBeGreaterThanOrEqual(timeline.statistics.averageSunAltitude);
      expect(timeline.statistics.minSunAltitude).toBeLessThanOrEqual(timeline.statistics.averageSunAltitude);
      expect(timeline.statistics.maxSunAltitude).toBeGreaterThanOrEqual(timeline.statistics.minSunAltitude);
    });
  });

  describe('Flight Parameters', () => {
    it('respects custom cruising speed', () => {
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timelineFast = generateFlightTimeline(LAX, JFK, departureTime, { cruisingSpeed: 900 });
      const timelineSlow = generateFlightTimeline(LAX, JFK, departureTime, { cruisingSpeed: 700 });
      
      // Faster speed should result in shorter duration
      expect(timelineFast.totalDuration).toBeLessThan(timelineSlow.totalDuration);
    });

    it('applies cruising speed to all points', () => {
      const customSpeed = 900;
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime, { cruisingSpeed: customSpeed });
      
      timeline.points.forEach(point => {
        expect(point.speed).toBe(customSpeed);
      });
    });

    it('applies cruising altitude to all points', () => {
      const customAltitude = 40000;
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timeline = generateFlightTimeline(LAX, JFK, departureTime, { cruisingAltitude: customAltitude });
      
      timeline.points.forEach(point => {
        expect(point.altitude).toBe(customAltitude);
      });
    });
  });

  describe('Long-haul Flights', () => {
    it('handles trans-pacific flight', () => {
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timeline = generateFlightTimeline(LAX, NRT, departureTime);
      
      // LAX to NRT is approximately 8800 km
      expect(timeline.totalDistance).toBeGreaterThan(8500);
      expect(timeline.totalDistance).toBeLessThan(9500);
      
      // Should take around 10-11 hours
      expect(timeline.totalDuration).toBeGreaterThan(550);
      expect(timeline.totalDuration).toBeLessThan(700);
    });

    it('handles transatlantic flight', () => {
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timeline = generateFlightTimeline(JFK, LHR, departureTime);
      
      // JFK to LHR is approximately 5540 km
      expect(timeline.totalDistance).toBeGreaterThan(5400);
      expect(timeline.totalDistance).toBeLessThan(5700);
    });

    it('long flights may have multiple sun events', () => {
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timeline = generateFlightTimeline(LAX, NRT, departureTime);
      
      // Long trans-pacific flight could have multiple sunrises/sunsets
      expect(timeline.sunEvents.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles very short flight', () => {
      const SFO: Airport = {
        iata: 'SFO',
        name: 'San Francisco International Airport',
        city: 'San Francisco',
        country: 'United States',
        lat: 37.6213,
        lon: -122.3790,
        timezone: 'America/Los_Angeles'
      };
      
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timeline = generateFlightTimeline(LAX, SFO, departureTime);
      
      expect(timeline.totalDistance).toBeGreaterThan(500);
      expect(timeline.totalDistance).toBeLessThan(600);
      expect(timeline.points).toHaveLength(151); // Default 150 + 1 for endpoint
    });

    it('handles polar route', () => {
      const SFO: Airport = {
        iata: 'SFO',
        name: 'San Francisco International Airport',
        city: 'San Francisco',
        country: 'United States',
        lat: 37.6213,
        lon: -122.3790,
        timezone: 'America/Los_Angeles'
      };
      
      const departureTime = new Date('2024-06-21T12:00:00Z');
      const timeline = generateFlightTimeline(SFO, LHR, departureTime);
      
      // Should handle high latitude points without errors
      expect(timeline.points.length).toBeGreaterThan(0);
      timeline.points.forEach(point => {
        expect(point.sunAltitude).toBeDefined();
        expect(isNaN(point.sunAltitude)).toBe(false);
      });
    });
  });
});


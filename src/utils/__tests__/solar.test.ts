import { describe, it, expect } from 'vitest';
import {
  getJulianDay,
  getJulianCentury,
  getSolarCoordinates,
  calculateSunPosition,
  toRadians,
  toDegrees
} from '../solar';
import {
  calculateDaylightInfo,
  calculateSolarNoon,
  calculateSolarMidnight
} from '../daylight';

describe('Solar Position Calculations', () => {
  describe('Julian Day Calculations', () => {
    it('calculates J2000.0 epoch correctly', () => {
      // J2000.0 = Jan 1, 2000, 12:00 UTC
      const j2000 = new Date('2000-01-01T12:00:00Z');
      const jd = getJulianDay(j2000);
      expect(jd).toBeCloseTo(2451545.0, 0.01);
    });

    it('calculates Julian Day for known date', () => {
      // Jan 1, 2024, 00:00 UTC
      const date = new Date('2024-01-01T00:00:00Z');
      const jd = getJulianDay(date);
      expect(jd).toBeCloseTo(2460310.5, 0.01);
    });

    it('calculates Julian Century correctly', () => {
      const j2000 = new Date('2000-01-01T12:00:00Z');
      const jd = getJulianDay(j2000);
      const T = getJulianCentury(jd);
      expect(T).toBeCloseTo(0, 0.001);
    });

    it('handles fractional days', () => {
      const morning = new Date('2024-06-21T06:00:00Z');
      const evening = new Date('2024-06-21T18:00:00Z');
      const jdMorning = getJulianDay(morning);
      const jdEvening = getJulianDay(evening);
      // Should be 0.5 days apart (12 hours)
      expect(jdEvening - jdMorning).toBeCloseTo(0.5, 0.01);
    });
  });

  describe('Solar Coordinates', () => {
    it('calculates solar coordinates for J2000.0', () => {
      const j2000 = new Date('2000-01-01T12:00:00Z');
      const jd = getJulianDay(j2000);
      const coords = getSolarCoordinates(jd);
      
      // At J2000.0, sun should be near RA=18h, Dec≈-23° (winter solstice season)
      expect(coords.rightAscension).toBeGreaterThan(17);
      expect(coords.rightAscension).toBeLessThan(20);
      expect(coords.declination).toBeGreaterThan(-24);
      expect(coords.declination).toBeLessThan(-22);
    });

    it('calculates solar coordinates for summer solstice', () => {
      const summerSolstice = new Date('2024-06-21T12:00:00Z');
      const jd = getJulianDay(summerSolstice);
      const coords = getSolarCoordinates(jd);
      
      // At summer solstice, declination should be near +23.44°
      expect(coords.declination).toBeGreaterThan(23);
      expect(coords.declination).toBeLessThan(24);
    });

    it('calculates solar coordinates for winter solstice', () => {
      const winterSolstice = new Date('2024-12-21T12:00:00Z');
      const jd = getJulianDay(winterSolstice);
      const coords = getSolarCoordinates(jd);
      
      // At winter solstice, declination should be near -23.44°
      expect(coords.declination).toBeGreaterThan(-24);
      expect(coords.declination).toBeLessThan(-23);
    });

    it('calculates solar coordinates for equinox', () => {
      const springEquinox = new Date('2024-03-20T12:00:00Z');
      const jd = getJulianDay(springEquinox);
      const coords = getSolarCoordinates(jd);
      
      // At equinox, declination should be near 0°
      expect(Math.abs(coords.declination)).toBeLessThan(2);
    });
  });

  describe('Sun Position', () => {
    it('calculates correct sun position at equator during equinox', () => {
      // Spring equinox at equator, approximate solar noon
      const date = new Date('2024-03-20T12:00:00Z');
      const sunPos = calculateSunPosition(0, 0, date);
      
      // Sun should be nearly overhead (altitude close to 90°)
      expect(sunPos.altitude).toBeGreaterThan(60);
      expect(sunPos.altitude).toBeLessThan(90);
    });

    it('calculates correct sun altitude at high latitude summer', () => {
      // Summer solstice at 60°N, solar noon
      const date = new Date('2024-06-21T12:00:00Z');
      const sunPos = calculateSunPosition(60, 0, date);
      
      // Sun altitude should be around 53° (90° - 60° + 23.44°)
      expect(sunPos.altitude).toBeGreaterThan(48);
      expect(sunPos.altitude).toBeLessThan(58);
    });

    it('detects daytime correctly', () => {
      // Noon in New York
      const noon = new Date('2024-06-21T16:00:00Z'); // Approx solar noon in NYC
      const sunPos = calculateSunPosition(40.7128, -74.0060, noon);
      expect(sunPos.altitude).toBeGreaterThan(0);
    });

    it('detects nighttime correctly', () => {
      // Midnight in New York
      const midnight = new Date('2024-06-21T04:00:00Z'); // Approx solar midnight in NYC
      const sunPos = calculateSunPosition(40.7128, -74.0060, midnight);
      expect(sunPos.altitude).toBeLessThan(0);
    });

    it('normalizes azimuth to 0-360 range', () => {
      const date = new Date('2024-06-21T12:00:00Z');
      const sunPos = calculateSunPosition(40, -74, date);
      expect(sunPos.azimuth).toBeGreaterThanOrEqual(0);
      expect(sunPos.azimuth).toBeLessThan(360);
    });

    it('calculates zenith correctly', () => {
      const date = new Date('2024-06-21T12:00:00Z');
      const sunPos = calculateSunPosition(0, 0, date);
      // Zenith should be 90° - altitude
      expect(sunPos.zenith).toBeCloseTo(90 - sunPos.altitude, 0.01);
    });
  });

  describe('Daylight Calculations', () => {
    it('detects polar day in Arctic summer', () => {
      const summerSolstice = new Date('2024-06-21T12:00:00Z');
      const daylight = calculateDaylightInfo(70, 0, summerSolstice);
      
      expect(daylight.isAlwaysDay).toBe(true);
      expect(daylight.dayLength).toBe(24);
      expect(daylight.sunrise).toBeNull();
      expect(daylight.sunset).toBeNull();
    });

    it('detects polar night in Arctic winter', () => {
      const winterSolstice = new Date('2024-12-21T12:00:00Z');
      const daylight = calculateDaylightInfo(70, 0, winterSolstice);
      
      expect(daylight.isAlwaysNight).toBe(true);
      expect(daylight.dayLength).toBe(0);
      expect(daylight.nightLength).toBe(24);
    });

    it('calculates sunrise and sunset for normal location', () => {
      // New York on summer solstice
      const date = new Date('2024-06-21T00:00:00Z');
      const daylight = calculateDaylightInfo(40.7128, -74.0060, date);
      
      expect(daylight.isAlwaysDay).toBe(false);
      expect(daylight.isAlwaysNight).toBe(false);
      expect(daylight.sunrise).not.toBeNull();
      expect(daylight.sunset).not.toBeNull();
      
      // Day length should be around 15 hours (longest day of year at 40°N)
      expect(daylight.dayLength).toBeGreaterThan(14);
      expect(daylight.dayLength).toBeLessThan(16);
    });

    it('calculates shorter day length in winter', () => {
      // New York on winter solstice
      const winterDate = new Date('2024-12-21T00:00:00Z');
      const winterDaylight = calculateDaylightInfo(40.7128, -74.0060, winterDate);
      
      // Winter day should be shorter than 10 hours at 40°N
      expect(winterDaylight.dayLength).toBeGreaterThan(8);
      expect(winterDaylight.dayLength).toBeLessThan(10);
    });

    it('calculates solar noon correctly', () => {
      const date = new Date('2024-06-21T00:00:00Z');
      const solarNoon = calculateSolarNoon(40.7128, -74.0060, date);
      
      // Solar noon at -74° longitude: 12:00 + (74/15) = ~16:56 UTC
      const hour = solarNoon.getUTCHours();
      expect(hour).toBeGreaterThan(15);
      expect(hour).toBeLessThan(18);
    });

    it('calculates solar midnight 12 hours after noon', () => {
      const date = new Date('2024-06-21T00:00:00Z');
      const solarNoon = calculateSolarNoon(40.7128, -74.0060, date);
      const solarMidnight = calculateSolarMidnight(40.7128, -74.0060, date);
      
      const diffHours = (solarMidnight.getTime() - solarNoon.getTime()) / 3600000;
      expect(diffHours).toBeCloseTo(12, 0.1);
    });

    it('sunrise occurs before sunset', () => {
      const date = new Date('2024-06-21T00:00:00Z');
      const daylight = calculateDaylightInfo(40.7128, -74.0060, date);
      
      if (daylight.sunrise && daylight.sunset) {
        expect(daylight.sunrise.getTime()).toBeLessThan(daylight.sunset.getTime());
      }
    });

    it('calculates approximately equal day/night at equator', () => {
      const equinox = new Date('2024-03-20T00:00:00Z');
      const daylight = calculateDaylightInfo(0, 0, equinox);
      
      // At equator during equinox, day and night should be ~12 hours each
      expect(daylight.dayLength).toBeGreaterThan(11.5);
      expect(daylight.dayLength).toBeLessThan(12.5);
    });
  });

  describe('Helper Functions', () => {
    it('converts degrees to radians correctly', () => {
      expect(toRadians(0)).toBe(0);
      expect(toRadians(180)).toBeCloseTo(Math.PI, 0.0001);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 0.0001);
    });

    it('converts radians to degrees correctly', () => {
      expect(toDegrees(0)).toBe(0);
      expect(toDegrees(Math.PI)).toBeCloseTo(180, 0.0001);
      expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 0.0001);
    });
  });

  describe('Edge Cases', () => {
    it('handles locations at prime meridian', () => {
      const date = new Date('2024-06-21T12:00:00Z');
      const sunPos = calculateSunPosition(51.5074, 0, date);
      expect(sunPos.altitude).toBeDefined();
      expect(sunPos.azimuth).toBeDefined();
    });

    it('handles locations at dateline', () => {
      const date = new Date('2024-06-21T12:00:00Z');
      const sunPos = calculateSunPosition(0, 180, date);
      expect(sunPos.altitude).toBeDefined();
      expect(sunPos.azimuth).toBeDefined();
    });

    it('handles north pole', () => {
      const date = new Date('2024-06-21T12:00:00Z');
      const sunPos = calculateSunPosition(90, 0, date);
      expect(sunPos.altitude).toBeDefined();
      expect(sunPos.altitude).toBeGreaterThan(0); // 24h sun in summer
    });

    it('handles south pole in winter', () => {
      const date = new Date('2024-06-21T12:00:00Z');
      const sunPos = calculateSunPosition(-90, 0, date);
      expect(sunPos.altitude).toBeDefined();
      expect(sunPos.altitude).toBeLessThan(0); // 24h night in winter
    });
  });
});


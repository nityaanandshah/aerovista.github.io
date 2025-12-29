/**
 * Sunrise, sunset, and twilight calculations
 */

/**
 * Complete daylight information for a location and date
 */
export interface DaylightInfo {
  sunrise: Date | null;          // null = no sunrise (polar night)
  sunset: Date | null;           // null = no sunset (polar day)
  solarNoon: Date;               // Sun at highest point
  solarMidnight: Date;           // Sun at lowest point
  civilTwilightStart: Date | null;
  civilTwilightEnd: Date | null;
  dayLength: number;             // Hours of daylight
  nightLength: number;           // Hours of darkness
  isAlwaysDay: boolean;          // 24h sun (polar day)
  isAlwaysNight: boolean;        // 24h dark (polar night)
}

/**
 * Twilight definitions based on solar altitude
 */
export enum TwilightType {
  CIVIL = -6,        // Bright enough to see without lights
  NAUTICAL = -12,    // Horizon visible at sea
  ASTRONOMICAL = -18 // Darkest night, stars visible
}

/**
 * Standard sunrise/sunset altitude accounting for refraction and sun's diameter
 */
export const SUNRISE_SUNSET_ALTITUDE = -0.833;

import { calculateSunPosition, getJulianDay, getJulianCentury, cosDeg, sinDeg } from './solar';

/**
 * Calculate complete daylight information for a location and date
 * Handles normal conditions as well as polar day/night edge cases
 */
export function calculateDaylightInfo(
  lat: number,
  lon: number,
  date: Date
): DaylightInfo {
  const solarNoon = calculateSolarNoon(lat, lon, date);
  const solarMidnight = calculateSolarMidnight(lat, lon, date);

  // Check for polar day/night conditions
  const noonSun = calculateSunPosition(lat, lon, solarNoon);
  const midnightSun = calculateSunPosition(lat, lon, solarMidnight);

  const isAlwaysDay = midnightSun.altitude > SUNRISE_SUNSET_ALTITUDE;
  const isAlwaysNight = noonSun.altitude < SUNRISE_SUNSET_ALTITUDE;

  let sunrise: Date | null = null;
  let sunset: Date | null = null;
  let civilTwilightStart: Date | null = null;
  let civilTwilightEnd: Date | null = null;

  // Only calculate sunrise/sunset if not in polar conditions
  if (!isAlwaysDay && !isAlwaysNight) {
    sunrise = findSunEvent(lat, lon, date, solarNoon, SUNRISE_SUNSET_ALTITUDE, 'rise');
    sunset = findSunEvent(lat, lon, date, solarNoon, SUNRISE_SUNSET_ALTITUDE, 'set');
    civilTwilightStart = findSunEvent(lat, lon, date, solarNoon, TwilightType.CIVIL, 'rise');
    civilTwilightEnd = findSunEvent(lat, lon, date, solarNoon, TwilightType.CIVIL, 'set');
  }

  // Calculate day length
  const dayLength = isAlwaysDay ? 24 
    : isAlwaysNight ? 0
    : sunrise && sunset ? (sunset.getTime() - sunrise.getTime()) / 3600000
    : 0;

  return {
    sunrise,
    sunset,
    solarNoon,
    solarMidnight,
    civilTwilightStart,
    civilTwilightEnd,
    dayLength,
    nightLength: 24 - dayLength,
    isAlwaysDay,
    isAlwaysNight
  };
}

/**
 * Calculate solar noon (time when sun reaches highest altitude)
 * Uses equation of time to correct for Earth's elliptical orbit and axial tilt
 */
export function calculateSolarNoon(lat: number, lon: number, date: Date): Date {
  const jd = getJulianDay(date);
  const T = getJulianCentury(jd);
  
  // Approximate solar noon based on longitude
  // Sun moves 15° per hour, so divide longitude by 15
  const solarNoonApprox = 12 - lon / 15;
  
  // Equation of time correction (in minutes)
  // Accounts for Earth's elliptical orbit and axial tilt
  const M = (357.52911 + T * (35999.05029 - T * 0.0001537)) % 360;
  const eot = 229.18 * (0.000075 
    + 0.001868 * cosDeg(M)
    - 0.032077 * sinDeg(M)
    - 0.014615 * cosDeg(2 * M)
    - 0.040849 * sinDeg(2 * M));
  
  const solarNoonCorrected = solarNoonApprox + eot / 60;
  
  // Create date at solar noon
  const noonDate = new Date(date);
  noonDate.setUTCHours(Math.floor(solarNoonCorrected));
  noonDate.setUTCMinutes((solarNoonCorrected % 1) * 60);
  noonDate.setUTCSeconds(0);
  noonDate.setUTCMilliseconds(0);
  
  return noonDate;
}

/**
 * Calculate solar midnight (time when sun reaches lowest altitude)
 * Simply 12 hours after solar noon
 */
export function calculateSolarMidnight(lat: number, lon: number, date: Date): Date {
  const noon = calculateSolarNoon(lat, lon, date);
  return new Date(noon.getTime() + 12 * 3600 * 1000); // 12 hours after noon
}

/**
 * Find exact time when sun crosses a given altitude
 * Uses binary search for precision to within ~10 seconds
 * 
 * @param targetAltitude Altitude to find (e.g., -0.833 for sunrise/sunset)
 * @param direction 'rise' searches before noon, 'set' searches after noon
 */
function findSunEvent(
  lat: number,
  lon: number,
  date: Date,
  solarNoon: Date,
  targetAltitude: number,
  direction: 'rise' | 'set'
): Date | null {
  // Define search window
  let low: Date, high: Date;
  
  if (direction === 'rise') {
    // Search from midnight to solar noon
    low = new Date(date);
    low.setUTCHours(0, 0, 0, 0);
    high = solarNoon;
  } else {
    // Search from solar noon to midnight
    low = solarNoon;
    high = new Date(date);
    high.setUTCHours(23, 59, 59, 999);
  }

  const MAX_ITERATIONS = 20;
  const PRECISION_MS = 10000; // 10 seconds

  // Binary search for the exact crossing time
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (high.getTime() - low.getTime() < PRECISION_MS) {
      break;
    }

    const mid = new Date((low.getTime() + high.getTime()) / 2);
    const sunPos = calculateSunPosition(lat, lon, mid);

    if (direction === 'rise') {
      // Before sunrise, altitude is below target
      if (sunPos.altitude < targetAltitude) {
        low = mid;
      } else {
        high = mid;
      }
    } else {
      // Before sunset, altitude is above target
      if (sunPos.altitude > targetAltitude) {
        low = mid;
      } else {
        high = mid;
      }
    }
  }

  return high;
}


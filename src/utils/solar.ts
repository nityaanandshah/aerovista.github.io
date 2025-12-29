/**
 * Solar position calculations using simplified Meeus algorithm
 * Reference: Jean Meeus - Astronomical Algorithms (2nd Edition)
 */

/**
 * Sun's position in the sky from observer's perspective
 */
export interface SunPosition {
  azimuth: number;        // 0-360°, 0=North, 90=East, 180=South, 270=West
  altitude: number;       // -90 to +90°, negative=below horizon
  zenith: number;         // 0-180°, 90° - altitude
  distance: number;       // Earth-Sun distance in AU (Astronomical Units)
  rightAscension: number; // Hours (0-24)
  declination: number;    // Degrees (-23.5 to +23.5)
}

/**
 * Helper functions for trigonometric calculations with degrees
 */
export function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

export function sinDeg(degrees: number): number {
  return Math.sin(toRadians(degrees));
}

export function cosDeg(degrees: number): number {
  return Math.cos(toRadians(degrees));
}

export function tanDeg(degrees: number): number {
  return Math.tan(toRadians(degrees));
}

export function asinDeg(x: number): number {
  return toDegrees(Math.asin(x));
}

export function acosDeg(x: number): number {
  return toDegrees(Math.acos(x));
}

export function atan2Deg(y: number, x: number): number {
  return toDegrees(Math.atan2(y, x));
}

/**
 * Convert Date to Julian Day Number
 * Reference: Meeus, Astronomical Algorithms, Chapter 7
 * 
 * Julian Day is a continuous count of days since noon UTC on January 1, 4713 BC
 * Used as a standard reference for astronomical calculations
 */
export function getJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // JS months are 0-indexed
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  // Integer division adjustments for calendar calculation
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  // Julian Day Number at midnight
  let jdn = day 
    + Math.floor((153 * m + 2) / 5)
    + 365 * y
    + Math.floor(y / 4)
    - Math.floor(y / 100)
    + Math.floor(y / 400)
    - 32045;

  // Add fractional day (time portion)
  // JD starts at noon, so subtract 12 hours
  const fraction = (hour - 12) / 24 + minute / 1440 + second / 86400;
  
  return jdn + fraction;
}

/**
 * Calculate Julian centuries since J2000.0 epoch (Jan 1, 2000, 12:00 UTC)
 * J2000.0 = JD 2451545.0
 * 
 * Used to calculate time-dependent astronomical parameters
 */
export function getJulianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/**
 * Calculate sun's position in equatorial coordinates
 * Returns right ascension (in hours) and declination (in degrees)
 * 
 * Reference: Meeus, Astronomical Algorithms, Chapter 25
 */
export function getSolarCoordinates(jd: number): {
  rightAscension: number;
  declination: number;
} {
  const T = getJulianCentury(jd);

  // Geometric mean longitude of the sun (degrees)
  // L0 increases by ~360° per year
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;

  // Mean anomaly of the sun (degrees)
  // Describes position in elliptical orbit
  const M = (357.52911 + T * (35999.05029 - T * 0.0001537)) % 360;

  // Sun's equation of center (correction for elliptical orbit)
  const C = (1.914602 - T * (0.004817 + T * 0.000014)) * sinDeg(M)
    + (0.019993 - T * 0.000101) * sinDeg(2 * M)
    + 0.000289 * sinDeg(3 * M);

  // True longitude of the sun
  const sunLongitude = L0 + C;

  // Apparent longitude (corrected for nutation and aberration)
  const omega = 125.04 - 1934.136 * T;
  const lambda = sunLongitude - 0.00569 - 0.00478 * sinDeg(omega);

  // Obliquity of the ecliptic (Earth's axial tilt, ~23.44°)
  const epsilon0 = 23.439291 - T * (0.0130042 + T * (0.00000016 - T * 0.000000504));
  const epsilon = epsilon0 + 0.00256 * cosDeg(omega);

  // Convert ecliptic coordinates to equatorial coordinates
  // Right Ascension
  const rightAscension = atan2Deg(
    cosDeg(epsilon) * sinDeg(lambda),
    cosDeg(lambda)
  );

  // Declination
  const declination = asinDeg(sinDeg(epsilon) * sinDeg(lambda));

  return {
    rightAscension: ((rightAscension + 360) % 360) / 15, // Convert to hours (0-24)
    declination
  };
}

/**
 * Calculate sun's position as seen from observer's location
 * Converts equatorial coordinates to horizontal coordinates (azimuth & altitude)
 * 
 * @param lat Observer's latitude in degrees (-90 to +90)
 * @param lon Observer's longitude in degrees (-180 to +180)
 * @param date Date and time of observation
 * @returns Sun position with azimuth, altitude, and other parameters
 */
export function calculateSunPosition(
  lat: number,
  lon: number,
  date: Date
): SunPosition {
  const jd = getJulianDay(date);
  const { rightAscension, declination } = getSolarCoordinates(jd);

  // Calculate Greenwich Mean Sidereal Time (GMST) in degrees
  // GMST is the angle between the prime meridian and vernal equinox
  const T = getJulianCentury(jd);
  const gmst = (280.46061837 
    + 360.98564736629 * (jd - 2451545.0)
    + T * T * (0.000387933 - T / 38710000)) % 360;

  // Calculate Local Sidereal Time (LST) in degrees
  // LST = GMST + observer's longitude
  const lst = (gmst + lon + 360) % 360;

  // Calculate Hour Angle (degrees)
  // Hour angle is the angle between the celestial object and the meridian
  const hourAngle = lst - rightAscension * 15; // Convert RA from hours to degrees

  // Convert to radians for trigonometric functions
  const latRad = toRadians(lat);
  const haRad = toRadians(hourAngle);
  const decRad = toRadians(declination);

  // Calculate altitude (elevation angle above horizon)
  // Uses spherical trigonometry
  const sinAlt = Math.sin(latRad) * Math.sin(decRad)
    + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitude = toDegrees(Math.asin(sinAlt));

  // Calculate azimuth (compass direction to sun)
  // Measured clockwise from North
  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt)
    / (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
  
  // Clamp cosAz to [-1, 1] to avoid numerical errors in acos
  let azimuth = toDegrees(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  
  // Adjust azimuth based on hour angle
  // If hour angle sine is positive, sun is in western half of sky
  if (Math.sin(haRad) > 0) {
    azimuth = 360 - azimuth;
  }

  // Apply atmospheric refraction correction
  const altitudeRefracted = altitude + getRefractionCorrection(altitude);

  // Calculate zenith angle (complement of altitude)
  const zenith = 90 - altitudeRefracted;

  return {
    azimuth: (azimuth + 360) % 360, // Normalize to 0-360
    altitude: altitudeRefracted,
    zenith,
    distance: 1.0, // Simplified: 1 AU (actual distance varies ±3%)
    rightAscension,
    declination
  };
}

/**
 * Calculate atmospheric refraction correction
 * Atmosphere bends light rays, making objects appear higher than they actually are
 * Effect is strongest near horizon (up to ~0.5°) and negligible overhead
 * 
 * @param altitude Geometric altitude in degrees
 * @returns Refraction correction in degrees (always positive)
 */
function getRefractionCorrection(altitude: number): number {
  // No correction needed high in the sky
  if (altitude > 85) return 0;
  
  // Standard refraction formula for altitudes 5° to 85°
  if (altitude > 5) {
    const tanAlt = tanDeg(altitude);
    return (58.1 / tanAlt
      - 0.07 / Math.pow(tanAlt, 3)
      + 0.000086 / Math.pow(tanAlt, 5)) / 3600; // Convert arcseconds to degrees
  }
  
  // Near-horizon refraction (altitude -0.575° to 5°)
  if (altitude > -0.575) {
    return (1735 
      + altitude * (-518.2 + altitude * (103.4 + altitude * (-12.79 + altitude * 0.711)))) / 3600;
  }
  
  // Below horizon refraction
  return -20.774 / tanDeg(altitude) / 3600;
}


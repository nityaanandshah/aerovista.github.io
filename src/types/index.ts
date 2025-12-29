/**
 * Core type definitions for AeroVista
 */

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface Waypoint {
  lat: number;
  lon: number;
  distance: number;  // Distance from origin in km
  bearing: number;   // Heading at this point (0-360°)
}

export interface DemoRoute {
  id: string;
  name: string;
  origin: string;  // IATA code
  destination: string;  // IATA code
  duration: number;  // minutes
  description: string;
  highlights: string[];
  defaultDeparture: string;  // HH:mm format
}

export interface FlightData {
  origin: Airport;
  destination: Airport;
  departureDate: Date;
  departureTime: string;
  timezone?: string;
}

// Solar position types (for Week 2)
export interface SunPosition {
  azimuth: number;        // 0-360°, 0=North, 90=East
  altitude: number;       // -90 to +90°, negative=below horizon
  zenith: number;         // 0-180°, complement of altitude
  distance: number;       // Earth-Sun distance in AU
  rightAscension: number; // Hours (0-24)
  declination: number;    // Degrees (-23.5 to +23.5)
}

// Timeline types (for Week 2)
export interface TimelinePoint {
  // Spatial position
  lat: number;
  lon: number;
  distance: number;        // km from origin
  
  // Temporal position
  timestamp: Date;
  elapsedMinutes: number;
  
  // Solar information
  sunAzimuth: number;
  sunAltitude: number;
  sunZenith: number;
  isDaylight: boolean;
  
  // Flight information
  heading: number;         // Aircraft bearing (0-360)
  speed: number;           // Ground speed km/h
  altitude?: number;       // Flight altitude in feet
}

export interface SunEvent {
  type: 'sunrise' | 'sunset';
  timestamp: Date;
  lat: number;
  lon: number;
  pointIndex: number;
  description: string;
}

export interface FlightTimeline {
  points: TimelinePoint[];
  origin: Airport;
  destination: Airport;
  totalDistance: number;
  totalDuration: number;      // minutes
  sunEvents: SunEvent[];
  statistics: TimelineStatistics;
}

export interface TimelineStatistics {
  daylightMinutes: number;
  darknessMinutes: number;
  daylightPercentage: number;
  averageSunAltitude: number;
  maxSunAltitude: number;
  minSunAltitude: number;
}

// Aircraft side logic types (for Week 4)
export type AircraftSide = 'LEFT' | 'RIGHT' | 'OVERHEAD' | 'NONE';

export interface AircraftSunExposure {
  side: AircraftSide;
  relativeBearing: number;    // -180 to 180, 0=ahead
  sunAngle: number;           // Angle of sun relative to aircraft
  intensity: number;          // 0-1, how direct the sunlight is
  recommendation: string;     // Human-readable recommendation
}

export interface FlightSunAnalysis {
  leftSideMinutes: number;
  rightSideMinutes: number;
  overheadMinutes: number;
  noSunMinutes: number;
  recommendation: string;
  detailedAnalysis: string[];
}



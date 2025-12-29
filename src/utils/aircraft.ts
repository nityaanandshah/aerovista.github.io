import { AircraftSide, AircraftSunExposure, FlightSunAnalysis, FlightTimeline } from '@/types';

/**
 * Determine which side of aircraft faces the sun
 */
export function calculateAircraftSunExposure(
  aircraftHeading: number,  // 0-360, degrees from north
  sunAzimuth: number,       // 0-360, sun's compass direction
  sunAltitude: number       // -90 to 90, sun's angle above horizon
): AircraftSunExposure {
  // Calculate relative bearing of sun to aircraft
  // 0° = directly ahead, 90° = right, -90° = left, ±180° = behind
  let relativeBearing = sunAzimuth - aircraftHeading;
  
  // Normalize to -180 to 180
  if (relativeBearing > 180) relativeBearing -= 360;
  if (relativeBearing < -180) relativeBearing += 360;

  // Determine side
  let side: AircraftSide;
  let recommendation: string;

  // Calculate intensity based on sun altitude and angle
  const directness = Math.abs(Math.abs(relativeBearing) - 90) / 90; // 0=perfectly side, 1=ahead/behind
  const altitudeFactor = Math.sin(toRadians(sunAltitude)); // Higher sun = more intense
  const intensity = sunAltitude > 0 
    ? (1 - directness) * altitudeFactor
    : 0;

  // Enhanced strategic recommendations
  if (sunAltitude < -6) {
    // Deep night (civil twilight threshold)
    side = 'NONE';
    recommendation = "Nighttime flight - ideal for rest or stargazing from either side";
  } else if (sunAltitude >= -6 && sunAltitude < 0) {
    // Twilight - sunrise/sunset opportunity!
    side = 'NONE';
    const isSunrise = sunAltitude > -3; // Approaching sunrise
    if (relativeBearing > 0) {
      recommendation = isSunrise 
        ? "Sunrise approaching on RIGHT side - perfect for golden hour photography!"
        : "Sunset colors visible on RIGHT side - grab your camera!";
    } else {
      recommendation = isSunrise
        ? "Sunrise approaching on LEFT side - perfect for golden hour photography!"
        : "Sunset colors visible on LEFT side - grab your camera!";
    }
  } else if (sunAltitude > 70) {
    // Sun nearly overhead (tropical routes)
    side = 'OVERHEAD';
    recommendation = "Tropical route - sun overhead, both sides have similar lighting for cloud photography";
  } else if (relativeBearing >= -30 && relativeBearing <= 30) {
    // Sun ahead
    side = 'NONE';
    if (sunAltitude < 15) {
      recommendation = "Low sun ahead - beautiful atmospheric views from either side";
    } else {
      recommendation = "Sun ahead - balanced lighting on both sides";
    }
  } else if (relativeBearing >= 150 || relativeBearing <= -150) {
    // Sun behind
    side = 'NONE';
    recommendation = "Sun behind - great lighting for forward views, either side works well";
  } else if (relativeBearing > 0) {
    // Sun on right side
    side = 'RIGHT';
    const angle = Math.abs(relativeBearing - 90);
    
    if (intensity > 0.7 && angle < 30) {
      // Only warn if REALLY intense
      recommendation = "Intense sun on RIGHT - choose LEFT side if you need to rest or work on screen";
    } else if (sunAltitude < 20) {
      // Low sun = golden hour opportunity
      recommendation = "RIGHT side has beautiful low-angle sunlight - great for aerial photography!";
    } else if (intensity > 0.5) {
      recommendation = "RIGHT side has good natural light - ideal for sightseeing and photos";
    } else {
      recommendation = "Gentle sunlight on RIGHT side - comfortable viewing conditions";
    }
  } else {
    // Sun on left side
    side = 'LEFT';
    const angle = Math.abs(relativeBearing + 90);
    
    if (intensity > 0.7 && angle < 30) {
      // Only warn if REALLY intense
      recommendation = "Intense sun on LEFT - choose RIGHT side if you need to rest or work on screen";
    } else if (sunAltitude < 20) {
      // Low sun = golden hour opportunity
      recommendation = "LEFT side has beautiful low-angle sunlight - great for aerial photography!";
    } else if (intensity > 0.5) {
      recommendation = "LEFT side has good natural light - ideal for sightseeing and photos";
    } else {
      recommendation = "Gentle sunlight on LEFT side - comfortable viewing conditions";
    }
  }

  return {
    side,
    relativeBearing,
    sunAngle: Math.abs(relativeBearing),
    intensity,
    recommendation
  };
}

/**
 * Analyze sun exposure over entire flight
 */
export function analyzeFlightSunExposure(
  timeline: FlightTimeline
): FlightSunAnalysis {
  let leftMinutes = 0;
  let rightMinutes = 0;
  let overheadMinutes = 0;
  let noSunMinutes = 0;

  const minutePerPoint = timeline.totalDuration / timeline.points.length;

  timeline.points.forEach(point => {
    const exposure = calculateAircraftSunExposure(
      point.heading,
      point.sunAzimuth || 0,
      point.sunAltitude || -90
    );

    switch (exposure.side) {
      case 'LEFT':
        leftMinutes += minutePerPoint;
        break;
      case 'RIGHT':
        rightMinutes += minutePerPoint;
        break;
      case 'OVERHEAD':
        overheadMinutes += minutePerPoint;
        break;
      case 'NONE':
        noSunMinutes += minutePerPoint;
        break;
    }
  });

  // Generate strategic recommendation
  let recommendation: string;
  const totalDaylight = leftMinutes + rightMinutes + overheadMinutes;
  const daylightPercent = (totalDaylight / timeline.totalDuration) * 100;
  
  if (noSunMinutes > timeline.totalDuration * 0.8) {
    // Mostly night flight
    recommendation = "Red-eye flight - minimal sun exposure. Perfect for sleeping or catching sunrise/sunset moments!";
  } else if (overheadMinutes > timeline.totalDuration * 0.4) {
    // Tropical route
    recommendation = "Tropical route with overhead sun - both sides great for cloud photography and ocean views";
  } else if (leftMinutes > rightMinutes * 2) {
    // Heavy left exposure
    const intensity = leftMinutes / totalDaylight;
    if (intensity > 0.7) {
      recommendation = "LEFT side has most sun exposure. Choose RIGHT for work/rest, LEFT for sightseeing and natural light";
    } else {
      recommendation = "LEFT side has more sunlight - good for photography and scenic views. RIGHT is quieter";
    }
  } else if (rightMinutes > leftMinutes * 2) {
    // Heavy right exposure
    const intensity = rightMinutes / totalDaylight;
    if (intensity > 0.7) {
      recommendation = "RIGHT side has most sun exposure. Choose LEFT for work/rest, RIGHT for sightseeing and natural light";
    } else {
      recommendation = "RIGHT side has more sunlight - good for photography and scenic views. LEFT is quieter";
    }
  } else if (daylightPercent > 80) {
    // Mostly daytime flight
    recommendation = "Full daytime flight - great visibility on both sides. Enjoy the aerial views!";
  } else if (timeline.sunEvents && timeline.sunEvents.length > 0) {
    // Has sunrise/sunset
    const firstEvent = timeline.sunEvents[0];
    if (firstEvent.type === 'sunrise') {
      recommendation = "Flight includes sunrise! Check sun events below for best viewing side and timing";
    } else {
      recommendation = "Flight includes sunset! Check sun events below for best viewing side and timing";
    }
  } else {
    recommendation = "Balanced sun exposure - both sides offer good views. Choose based on your preference!";
  }

  const detailedAnalysis = [
    `Left side exposure: ${formatDuration(leftMinutes)} (${((leftMinutes/timeline.totalDuration)*100).toFixed(0)}%)`,
    `Right side exposure: ${formatDuration(rightMinutes)} (${((rightMinutes/timeline.totalDuration)*100).toFixed(0)}%)`,
    `Overhead sun: ${formatDuration(overheadMinutes)} (${((overheadMinutes/timeline.totalDuration)*100).toFixed(0)}%)`,
    `No sun (night/ahead/behind): ${formatDuration(noSunMinutes)} (${((noSunMinutes/timeline.totalDuration)*100).toFixed(0)}%)`
  ];

  return {
    leftSideMinutes: leftMinutes,
    rightSideMinutes: rightMinutes,
    overheadMinutes: overheadMinutes,
    noSunMinutes: noSunMinutes,
    recommendation,
    detailedAnalysis
  };
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}


import React, { useState, useMemo } from 'react';
import { Airport, FlightData } from '@/types';
import airportsData from '@/data/airports.json';

interface FlightInputProps {
  onSubmit: (data: FlightData) => void;
}

// Comprehensive list of timezones for global flight bookings
const TIMEZONES = [
  // UTC
  { value: 'UTC', label: 'UTC +0:00', offset: 0 },
  
  // Americas
  { value: 'America/New_York', label: 'New York (EST/EDT) -5:00/-4:00', offset: -5 },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT) -6:00/-5:00', offset: -6 },
  { value: 'America/Denver', label: 'Denver (MST/MDT) -7:00/-6:00', offset: -7 },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT) -8:00/-7:00', offset: -8 },
  { value: 'America/Anchorage', label: 'Anchorage (AKST) -9:00', offset: -9 },
  { value: 'America/Toronto', label: 'Toronto (EST/EDT) -5:00/-4:00', offset: -5 },
  { value: 'America/Mexico_City', label: 'Mexico City (CST) -6:00', offset: -6 },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT) -3:00', offset: -3 },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART) -3:00', offset: -3 },
  
  // Europe
  { value: 'Europe/London', label: 'London (GMT/BST) +0:00/+1:00', offset: 0 },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST) +1:00/+2:00', offset: 1 },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST) +1:00/+2:00', offset: 1 },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST) +1:00/+2:00', offset: 1 },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST) +1:00/+2:00', offset: 1 },
  { value: 'Europe/Moscow', label: 'Moscow (MSK) +3:00', offset: 3 },
  { value: 'Europe/Istanbul', label: 'Istanbul (TRT) +3:00', offset: 3 },
  
  // Middle East & Africa
  { value: 'Africa/Cairo', label: 'Cairo (EET) +2:00', offset: 2 },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST) +2:00', offset: 2 },
  { value: 'Africa/Lagos', label: 'Lagos (WAT) +1:00', offset: 1 },
  { value: 'Asia/Dubai', label: 'Dubai (GST) +4:00', offset: 4 },
  { value: 'Asia/Riyadh', label: 'Riyadh (AST) +3:00', offset: 3 },
  { value: 'Asia/Tehran', label: 'Tehran (IRST) +3:30', offset: 3.5 },
  
  // Asia
  { value: 'Asia/Kolkata', label: 'India (IST) +5:30', offset: 5.5 },
  { value: 'Asia/Karachi', label: 'Karachi (PKT) +5:00', offset: 5 },
  { value: 'Asia/Dhaka', label: 'Dhaka (BST) +6:00', offset: 6 },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT) +7:00', offset: 7 },
  { value: 'Asia/Singapore', label: 'Singapore (SGT) +8:00', offset: 8 },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT) +8:00', offset: 8 },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST) +8:00', offset: 8 },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST) +9:00', offset: 9 },
  { value: 'Asia/Seoul', label: 'Seoul (KST) +9:00', offset: 9 },
  
  // Oceania
  { value: 'Australia/Perth', label: 'Perth (AWST) +8:00', offset: 8 },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT) +10:00/+11:00', offset: 10 },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT) +10:00/+11:00', offset: 10 },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT) +12:00/+13:00', offset: 12 },
  
  // Pacific
  { value: 'Pacific/Honolulu', label: 'Honolulu (HST) -10:00', offset: -10 },
  { value: 'Pacific/Fiji', label: 'Fiji (FJT) +12:00', offset: 12 },
];

export function FlightInput({ onSubmit }: FlightInputProps) {
  const [origin, setOrigin] = useState<Airport | null>(null);
  const [destination, setDestination] = useState<Airport | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('08:00');
  const [timezone, setTimezone] = useState<string>('UTC');
  const [originSearch, setOriginSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [timezoneSearch, setTimezoneSearch] = useState('UTC +0:00');
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [error, setError] = useState('');

  const airports = airportsData.airports as Airport[];

  // Filter airports based on search (IATA, name, city, country)
  const filteredOrigins = useMemo(() => {
    if (!originSearch) return [];
    const search = originSearch.toLowerCase();
    return airports
      .filter(airport =>
        airport.iata.toLowerCase().includes(search) ||
        airport.name.toLowerCase().includes(search) ||
        airport.city.toLowerCase().includes(search) ||
        airport.country.toLowerCase().includes(search)
      )
      .slice(0, 10); // Show more results with larger database
  }, [originSearch, airports]);

  const filteredDestinations = useMemo(() => {
    if (!destinationSearch) return [];
    const search = destinationSearch.toLowerCase();
    return airports
      .filter(airport =>
        airport.iata.toLowerCase().includes(search) ||
        airport.name.toLowerCase().includes(search) ||
        airport.city.toLowerCase().includes(search) ||
        airport.country.toLowerCase().includes(search)
      )
      .slice(0, 10); // Show more results with larger database
  }, [destinationSearch, airports]);

  // Filter timezones based on search
  const filteredTimezones = useMemo(() => {
    if (!timezoneSearch) return TIMEZONES.slice(0, 8); // Show first 8 by default
    const search = timezoneSearch.toLowerCase();
    return TIMEZONES.filter(tz =>
      tz.label.toLowerCase().includes(search) ||
      tz.value.toLowerCase().includes(search)
    ).slice(0, 8); // Limit to 8 results
  }, [timezoneSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!origin || !destination) {
      setError('Please select both origin and destination airports');
      return;
    }

    if (origin.iata === destination.iata) {
      setError('Origin and destination must be different airports');
      return;
    }

    // Convert local time in selected timezone to UTC
    let departureDate: Date;
    
    try {
      // Parse date and time parts
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      
      if (timezone === 'UTC') {
        // Direct UTC time
        departureDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
      } else {
        // Get the timezone offset from our TIMEZONES array
        const selectedTz = TIMEZONES.find(tz => tz.value === timezone);
        if (!selectedTz) {
          setError('Invalid timezone selected');
          return;
        }
        
        // Create UTC date by subtracting the timezone offset
        // For example: 8:00 AM IST (UTC+5.5) should become 2:30 AM UTC
        const offsetHours = selectedTz.offset;
        const offsetMinutes = Math.floor((offsetHours % 1) * 60);
        const offsetHoursInt = Math.floor(offsetHours);
        
        // Create date in "local" time (treating it as if it's in the selected timezone)
        let utcHours = hours - offsetHoursInt;
        let utcMinutes = minutes - offsetMinutes;
        let utcDay = day;
        let utcMonth = month;
        let utcYear = year;
        
        // Handle minute overflow/underflow
        if (utcMinutes < 0) {
          utcMinutes += 60;
          utcHours -= 1;
        } else if (utcMinutes >= 60) {
          utcMinutes -= 60;
          utcHours += 1;
        }
        
        // Handle hour overflow/underflow
        if (utcHours < 0) {
          utcHours += 24;
          utcDay -= 1;
          if (utcDay < 1) {
            utcMonth -= 1;
            if (utcMonth < 1) {
              utcMonth = 12;
              utcYear -= 1;
            }
            // Get last day of previous month (simplified)
            utcDay = new Date(utcYear, utcMonth, 0).getDate();
          }
        } else if (utcHours >= 24) {
          utcHours -= 24;
          utcDay += 1;
          const daysInMonth = new Date(utcYear, utcMonth, 0).getDate();
          if (utcDay > daysInMonth) {
            utcDay = 1;
            utcMonth += 1;
            if (utcMonth > 12) {
              utcMonth = 1;
              utcYear += 1;
            }
          }
        }
        
        departureDate = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcHours, utcMinutes, 0));
      }
      
      if (isNaN(departureDate.getTime())) {
        setError('Invalid date or time');
        return;
      }
    } catch (error) {
      setError('Invalid date, time, or timezone');
      return;
    }

    onSubmit({
      origin,
      destination,
      departureDate,
      departureTime: time,
      timezone
    });
  };

  const selectOrigin = (airport: Airport) => {
    setOrigin(airport);
    setOriginSearch(`${airport.iata} - ${airport.city}`);
  };

  const selectDestination = (airport: Airport) => {
    setDestination(airport);
    setDestinationSearch(`${airport.iata} - ${airport.city}`);
  };

  const selectTimezone = (tz: typeof TIMEZONES[0]) => {
    setTimezone(tz.value);
    setTimezoneSearch(tz.label);
    setShowTimezoneDropdown(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-gray-900/50 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700/50">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Plan Your Seat</h2>
        <p className="text-gray-300">
          Enter your flight details to visualize your journey
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Origin Airport */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            From
          </label>
          <div className="relative">
            <input
              type="text"
              value={originSearch}
              onChange={(e) => {
                setOriginSearch(e.target.value);
                setError(''); // Clear error when user starts typing
              }}
              onFocus={() => {
                setOriginSearch('');
                setOrigin(null);
              }}
              placeholder="Search airport (code, city, or name)"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {filteredOrigins.length > 0 && originSearch && !origin && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-auto">
                {filteredOrigins.map((airport) => (
                  <button
                    key={airport.iata}
                    type="button"
                    onClick={() => selectOrigin(airport)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors"
                  >
                    <div className="font-semibold text-white">
                      {airport.iata} - {airport.city}
                    </div>
                    <div className="text-sm text-gray-300">{airport.name}</div>
                    <div className="text-xs text-gray-400">{airport.country}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {origin && (
            <div className="mt-2 text-sm text-green-400">
              ✓ Selected: {origin.iata} - {origin.name}
            </div>
          )}
        </div>

        {/* Destination Airport */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            To
          </label>
          <div className="relative">
            <input
              type="text"
              value={destinationSearch}
              onChange={(e) => {
                setDestinationSearch(e.target.value);
                setError(''); // Clear error when user starts typing
              }}
              onFocus={() => {
                setDestinationSearch('');
                setDestination(null);
              }}
              placeholder="Search airport (code, city, or name)"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {filteredDestinations.length > 0 && destinationSearch && !destination && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-auto">
                {filteredDestinations.map((airport) => (
                  <button
                    key={airport.iata}
                    type="button"
                    onClick={() => selectDestination(airport)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors"
                  >
                    <div className="font-semibold text-white">
                      {airport.iata} - {airport.city}
                    </div>
                    <div className="text-sm text-gray-300">{airport.name}</div>
                    <div className="text-xs text-gray-400">{airport.country}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {destination && (
            <div className="mt-2 text-sm text-green-400">
              ✓ Selected: {destination.iata} - {destination.name}
            </div>
          )}
        </div>

        {/* Date, Time and Timezone - All in one line */}
        <div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Departure Date
              </label>
              <div className="relative">
                <input
                  ref={(el) => {
                    if (el) (window as any).dateInputRef = el;
                  }}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent [color-scheme:dark]"
                  style={{ colorScheme: 'dark' }}
                />
                <button
                  type="button"
                  onClick={() => (window as any).dateInputRef?.showPicker?.()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                  title="Open calendar"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#9CA3AF"
                    strokeWidth="1.5"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Departure Time
              </label>
              <div className="relative">
                <input
                  ref={(el) => {
                    if (el) (window as any).timeInputRef = el;
                  }}
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent [color-scheme:dark]"
                  style={{ colorScheme: 'dark' }}
                />
                <button
                  type="button"
                  onClick={() => (window as any).timeInputRef?.showPicker?.()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                  title="Open time picker"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#9CA3AF"
                    strokeWidth="1.5"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Timezone
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={timezoneSearch}
                  onChange={(e) => {
                    setTimezoneSearch(e.target.value);
                    setShowTimezoneDropdown(true);
                  }}
                  onFocus={() => setShowTimezoneDropdown(true)}
                  onBlur={() => {
                    // Delay to allow click on dropdown
                    setTimeout(() => setShowTimezoneDropdown(false), 200);
                  }}
                  placeholder="Search timezone"
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {showTimezoneDropdown && filteredTimezones.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-auto">
                    {filteredTimezones.map((tz) => (
                      <button
                        key={tz.value}
                        type="button"
                        onClick={() => selectTimezone(tz)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors"
                      >
                        <div className="text-sm text-white">{tz.label}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Selected: {TIMEZONES.find(tz => tz.value === timezone)?.label || 'UTC'}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 focus:ring-4 focus:ring-blue-500/50 transition-all transform hover:scale-[1.02]"
        >
          Calculate Flight Route
        </button>
      </form>
    </div>
  );
}



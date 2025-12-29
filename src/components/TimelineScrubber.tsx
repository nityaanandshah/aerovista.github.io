import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { FlightTimeline, SunEvent } from '@/types';

interface TimelineScrubberProps {
  timeline: FlightTimeline;
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onIndexChange: (index: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  timezone?: string;
}

// Helper function to format time in selected timezone
function formatTimeInTimezone(date: Date, timezone: string = 'UTC'): string {
  try {
    // Ensure we have a valid Date object
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    // Format time in the selected timezone
    const timeString = date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Get timezone abbreviation - map common ones to standard abbreviations
    let tzAbbr = 'UTC';
    if (timezone !== 'UTC') {
      // Manual mapping for common timezones to get clean abbreviations
      const timezoneAbbreviations: { [key: string]: string } = {
        'Asia/Kolkata': 'IST',
        'Asia/Calcutta': 'IST',
        'America/New_York': 'EST/EDT',
        'America/Chicago': 'CST/CDT',
        'America/Denver': 'MST/MDT',
        'America/Los_Angeles': 'PST/PDT',
        'Europe/London': 'GMT/BST',
        'Europe/Paris': 'CET/CEST',
        'Asia/Dubai': 'GST',
        'Asia/Tokyo': 'JST',
        'Asia/Singapore': 'SGT',
        'Asia/Hong_Kong': 'HKT',
        'Australia/Sydney': 'AEDT/AEST',
      };
      
      // Try manual mapping first
      if (timezoneAbbreviations[timezone]) {
        tzAbbr = timezoneAbbreviations[timezone];
      } else {
        // Fallback to Intl.DateTimeFormat
        try {
          const formatter = new Intl.DateTimeFormat('en-US', { 
            timeZone: timezone, 
            timeZoneName: 'short' 
          });
          const parts = formatter.formatToParts(date);
          const tzPart = parts.find(part => part.type === 'timeZoneName');
          let abbr = tzPart?.value || '';
          
          // Clean up GMT offsets to just show the city name
          if (abbr.startsWith('GMT')) {
            tzAbbr = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
          } else {
            tzAbbr = abbr;
          }
        } catch (e) {
          // If we can't get the abbreviation, use the city name
          tzAbbr = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
        }
      }
    }
    
    return `${timeString} ${tzAbbr}`;
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    console.error('Error formatting time in timezone:', error, 'Date:', date, 'Timezone:', timezone);
    const timeString = date.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${timeString} UTC`;
  }
}

export function TimelineScrubber({
  timeline,
  currentIndex,
  isPlaying,
  playbackSpeed,
  onIndexChange,
  onPlayPause,
  onSpeedChange,
  timezone = 'UTC'
}: TimelineScrubberProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const currentPoint = timeline.points[currentIndex];
  const progress = (currentIndex / (timeline.points.length - 1)) * 100;

  // Playback animation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (currentIndex < timeline.points.length - 1) {
        onIndexChange(currentIndex + 1);
      } else {
        // Stop at destination instead of looping
        onPlayPause(); // This will stop playback
      }
    }, 100 / playbackSpeed); // Faster speed = shorter interval

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, playbackSpeed, timeline.points.length, onIndexChange, onPlayPause]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newIndex = Math.floor(percentage * (timeline.points.length - 1));

    onIndexChange(Math.max(0, Math.min(timeline.points.length - 1, newIndex)));
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleProgressClick(e);
    }
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full bg-gray-900/40 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg shadow-xl">
      {/* Time Display */}
      <div className="flex justify-between items-center mb-1">
        <div>
          <div className="text-sm font-bold">
            {formatTimeInTimezone(currentPoint.timestamp, timezone)}
          </div>
          <div className="text-xs text-gray-300">
            {formatDuration(currentPoint.elapsedMinutes)} / {formatDuration(timeline.totalDuration)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div 
        ref={progressBarRef}
        className="relative h-5 bg-gray-800/50 rounded cursor-pointer mb-1 overflow-visible"
        onClick={handleProgressClick}
        onMouseDown={handleProgressMouseDown}
        onMouseMove={handleProgressMouseMove}
        onMouseUp={handleProgressMouseUp}
        onMouseLeave={handleProgressMouseUp}
      >
        {/* Background gradient (daylight visualization) */}
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          {renderDaylightGradient(timeline)}
        </div>

        {/* Sun events markers */}
        {timeline.sunEvents?.map((event, i) => (
          <SunEventMarker
            key={i}
            event={event}
            totalPoints={timeline.points.length}
            timezone={timezone}
          />
        ))}

        {/* Progress indicator */}
        <div
          className="absolute top-0 h-full bg-white/15 rounded-l transition-all"
          style={{ width: `${progress}%` }}
        />

        {/* Current position handle */}
        <div
          className="absolute top-1/2 transform -translate-y-1/2 w-2 h-4 bg-white rounded-sm shadow-lg pointer-events-none"
          style={{ left: `${progress}%`, marginLeft: '-4px' }}
        />
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onIndexChange(0)}
            className="p-0.5 hover:bg-white/10 rounded transition"
            title="Reset to start"
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={onPlayPause}
            className={`p-1 rounded-full transition ${
              isPlaying 
                ? 'border-2 border-white bg-transparent hover:bg-white/10' 
                : 'hover:bg-white/10'
            }`}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={() => onIndexChange(timeline.points.length - 1)}
            className="p-0.5 hover:bg-white/10 rounded transition"
            title="Skip to end"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-300">Speed:</span>
          {[0.5, 1, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`px-1.5 py-0.5 rounded text-xs transition ${
                playbackSpeed === speed 
                  ? 'border border-white bg-transparent' 
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper component for sun event markers
function SunEventMarker({ event, totalPoints, timezone = 'UTC' }: { 
  event: SunEvent; 
  totalPoints: number;
  timezone?: string;
}) {
  const position = (event.pointIndex / (totalPoints - 1)) * 100;
  const isSunrise = event.type === 'sunrise';
  const eventLabel = isSunrise ? 'Sunrise' : 'Sunset';
  const eventTime = formatTimeInTimezone(event.timestamp, timezone);

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/70 group"
      style={{ left: `${position}%` }}
    >
      {/* Sun icon */}
      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 cursor-pointer">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={isSunrise ? 'text-orange-400' : 'text-orange-600'}
        >
          {/* Sun circle */}
          <circle cx="12" cy="12" r="5" fill="currentColor" />
          {/* Sun rays */}
          <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Arrow indicator */}
          {isSunrise ? (
            <path d="M12 16 L9 13 L12 13 L12 16 L15 13 L12 13" fill="currentColor" />
          ) : (
            <path d="M12 8 L9 11 L12 11 L12 8 L15 11 L12 11" fill="currentColor" />
          )}
        </svg>
        
        {/* Tooltip on hover */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
            <div className="font-semibold">{eventLabel}</div>
            <div className="text-gray-300">{eventTime}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Render daylight as gradient background
function renderDaylightGradient(timeline: FlightTimeline) {
  const gradientStops = timeline.points
    .filter((_, i) => i % 5 === 0) // Sample every 5th point for performance
    .map((point, i, arr) => {
      const position = (i / (arr.length - 1)) * 100;
      const color = point.isDaylight 
        ? 'rgba(135, 206, 250, 0.4)'  // Sky blue for day (matches globe atmosphere)
        : 'rgba(25, 25, 60, 0.5)';    // Deep navy for night (matches space background)
      return `${color} ${position}%`;
    });

  return (
    <div
      className="w-full h-full"
      style={{
        background: `linear-gradient(to right, ${gradientStops.join(', ')})`
      }}
    />
  );
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}


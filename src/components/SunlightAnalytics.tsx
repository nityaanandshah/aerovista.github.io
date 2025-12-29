import React from 'react';
import { Sun, Moon, Plane } from 'lucide-react';
import { FlightTimeline, TimelinePoint, AircraftSide } from '@/types';
import { analyzeFlightSunExposure, calculateAircraftSunExposure } from '@/utils/aircraft';

interface SunlightAnalyticsProps {
  timeline: FlightTimeline;
  currentPoint: TimelinePoint;
}

export function SunlightAnalytics({ timeline, currentPoint }: SunlightAnalyticsProps) {
  const flightAnalysis = analyzeFlightSunExposure(timeline);
  const currentExposure = calculateAircraftSunExposure(
    currentPoint.heading,
    currentPoint.sunAzimuth || 0,
    currentPoint.sunAltitude || -90
  );

  return (
    <div className="space-y-6 p-6 bg-gray-900/30 backdrop-blur-sm rounded-lg shadow-xl text-white">
      {/* Current Status */}
      <div className="border-b border-gray-700 pb-4">
        <h2 className="text-2xl font-bold mb-4 text-white">Current Position</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400">Sun Position</div>
            <div className="text-lg font-medium text-white">
              {(currentPoint.sunAltitude || 0).toFixed(1)}° altitude
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-400">Lighting</div>
            <div className="text-lg font-medium text-white">
              {currentPoint.isDaylight ? 'Daylight' : 'Darkness'}
            </div>
          </div>
        </div>
      </div>

      {/* Aircraft Side Visualization */}
      <div className="border-b border-gray-700 pb-4">
        <h3 className="text-xl font-bold mb-4 text-white">Window Sun Exposure</h3>
        
        <AircraftSideVisualizer
          side={currentExposure.side}
          intensity={currentExposure.intensity}
        />

        <div className="mt-4 p-4 bg-blue-900/40 backdrop-blur-sm rounded-lg border border-blue-500/30">
          <div className="font-medium text-blue-200">
            {currentExposure.recommendation}
          </div>
        </div>
      </div>

      {/* Flight-Wide Analysis */}
      <div className="border-b border-gray-700 pb-4">
        <h3 className="text-xl font-bold mb-4 text-white">Full Flight Analysis</h3>
        
        <div className="space-y-3 mb-4">
          {flightAnalysis.detailedAnalysis.map((line, i) => (
            <div key={i} className="text-sm text-gray-300">
              {line}
            </div>
          ))}
        </div>

        {/* Visual bar chart */}
        <div className="h-8 flex rounded overflow-hidden">
          <div
            className="bg-cyan-400"
            style={{ width: `${(flightAnalysis.leftSideMinutes / timeline.totalDuration) * 100}%` }}
            title="Left side exposure"
          />
          <div
            className="bg-purple-400"
            style={{ width: `${(flightAnalysis.rightSideMinutes / timeline.totalDuration) * 100}%` }}
            title="Right side exposure"
          />
          <div
            className="bg-orange-400"
            style={{ width: `${(flightAnalysis.overheadMinutes / timeline.totalDuration) * 100}%` }}
            title="Overhead sun"
          />
          <div
            className="bg-gray-600"
            style={{ width: `${(flightAnalysis.noSunMinutes / timeline.totalDuration) * 100}%` }}
            title="No sun"
          />
        </div>

        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span className="text-cyan-400">● Left</span>
          <span className="text-purple-400">● Right</span>
          <span className="text-orange-400">● Overhead</span>
          <span className="text-gray-500">● None</span>
        </div>

        <div className="mt-4 p-4 bg-green-900/40 backdrop-blur-sm rounded-lg border border-green-500/30">
          <div className="font-bold text-green-200 mb-1 flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/>
            </svg>
            Recommendation
          </div>
          <div className="text-green-300">
            {flightAnalysis.recommendation}
          </div>
        </div>
      </div>

      {/* Sun Events */}
      {timeline.sunEvents && timeline.sunEvents.length > 0 && (
        <div className="border-b border-gray-700 pb-4">
          <h3 className="text-xl font-bold mb-4 text-white">Sunrise & Sunset Events</h3>
          <div className="space-y-2">
            {timeline.sunEvents.map((event, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded">
                <div>
                  <div className="font-medium capitalize text-white">{event.type}</div>
                  <div className="text-sm text-gray-400">
                    {event.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'UTC'
                    })} UTC
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div>
        <h3 className="text-xl font-bold mb-4 text-white">Flight Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Distance"
            value={`${timeline.totalDistance.toFixed(0)} km`}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <StatCard
            label="Flight Duration"
            value={formatDuration(timeline.totalDuration)}
            icon={<Plane className="w-5 h-5" />}
          />
          <StatCard
            label="Daylight Time"
            value={`${timeline.statistics?.daylightPercentage.toFixed(0) || 0}%`}
            icon={<Sun className="w-5 h-5" />}
          />
          <StatCard
            label="Darkness Time"
            value={`${(100 - (timeline.statistics?.daylightPercentage || 0)).toFixed(0)}%`}
            icon={<Moon className="w-5 h-5" />}
          />
        </div>
      </div>
    </div>
  );
}

// Aircraft side visualizer component
function AircraftSideVisualizer({ 
  side, 
  intensity 
}: { 
  side: AircraftSide; 
  intensity: number; 
}) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="relative">
        {/* Aircraft top view */}
        <svg width="200" height="120" viewBox="0 0 200 120">
          {/* Fuselage */}
          <ellipse cx="100" cy="60" rx="15" ry="50" fill="#d1d5db" />
          
          {/* Wings */}
          <rect x="30" y="55" width="140" height="10" fill="#9ca3af" />
          
          {/* Left side highlight */}
          <rect
            x="20"
            y="40"
            width="40"
            height="40"
            fill={side === 'LEFT' ? '#fbbf24' : '#e5e7eb'}
            opacity={side === 'LEFT' ? intensity : 0.3}
          />
          
          {/* Right side highlight */}
          <rect
            x="140"
            y="40"
            width="40"
            height="40"
            fill={side === 'RIGHT' ? '#fbbf24' : '#e5e7eb'}
            opacity={side === 'RIGHT' ? intensity : 0.3}
          />
          
          {/* Labels */}
          <text x="40" y="25" fontSize="12" fill="#374151">LEFT</text>
          <text x="150" y="25" fontSize="12" fill="#374151">RIGHT</text>
          
          {/* Cockpit */}
          <ellipse cx="100" cy="20" rx="10" ry="8" fill="#6b7280" />
        </svg>

        {/* Sun indicator */}
        {(side === 'LEFT' || side === 'RIGHT') && (
          <div className={`absolute top-1/2 ${side === 'LEFT' ? 'left-0' : 'right-0'} transform -translate-y-1/2 ${side === 'LEFT' ? '-translate-x-8' : 'translate-x-8'}`}>
            <Sun className="text-yellow-500" size={32} />
          </div>
        )}

        {side === 'OVERHEAD' && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8">
            <Sun className="text-yellow-500" size={32} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg">
      <div className="flex items-center gap-2 mb-2 text-gray-400">
        {icon}
        <div className="text-sm">{label}</div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function getCompassDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}


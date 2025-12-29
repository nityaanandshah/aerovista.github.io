import React, { useState } from 'react';
import { FlightInput } from './components/FlightInput';
import { Globe3D } from './components/Globe3D';
import { TimelineScrubber } from './components/TimelineScrubber';
import { SunlightAnalytics } from './components/SunlightAnalytics';
import { FlightData, FlightTimeline } from './types';
import { generateFlightTimeline } from './utils/timeline';

function App() {
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [timeline, setTimeline] = useState<FlightTimeline | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('UTC');

  const handleFlightSubmit = (data: FlightData) => {
    // Generate flight timeline with solar data
    const flightTimeline = generateFlightTimeline(
      data.origin,
      data.destination,
      data.departureDate
    );
    
    setFlightData(data);
    setTimeline(flightTimeline);
    setCurrentIndex(0);
    setIsPlaying(false);
    setSelectedTimezone(data.timezone || 'UTC');
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetView = () => {
    setFlightData(null);
    setTimeline(null);
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header - Only show on input screen */}
      {!timeline && (
        <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">
              <span className="text-blue-400">AERO</span>
              <span className="text-orange-400">VISTA</span>
            </h1>
          </div>
        </header>
      )}

      {/* Main Content */}
      {!timeline ? (
        // Input Screen
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <FlightInput onSubmit={handleFlightSubmit} />
        </div>
      ) : (
        // Full-Screen Globe with Overlays
        <div className="relative w-full h-screen">
          {/* Globe Background */}
          <div className="absolute inset-0 bg-black">
            <Globe3D
              timeline={timeline}
              currentPointIndex={currentIndex}
            />
          </div>

          {/* Top Bar Overlay */}
          <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white p-4 z-10">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold">
                  <span className="text-blue-400">AERO</span>
                  <span className="text-orange-400">VISTA</span>
                </h1>
                <div className="h-6 w-px bg-white/30"></div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">
                    <span className="text-gray-300">
                      {flightData.origin.iata} → {flightData.destination.iata}
                    </span>
                  </div>
                  {/* Info Icon */}
                  <div className="relative group">
                    <button
                      onClick={() => setShowAnalytics(!showAnalytics)}
                      className="p-1 hover:bg-white/10 rounded transition"
                      title="Flight Analytics"
                    >
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                        <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {/* Hover tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                      <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
                        Flight Analytics
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={resetView}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm text-sm"
              >
                ← New Flight
              </button>
            </div>
          </div>

          {/* Timeline Scrubber Overlay - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
            <div className="max-w-7xl mx-auto">
              <TimelineScrubber
                timeline={timeline}
                currentIndex={currentIndex}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                onIndexChange={setCurrentIndex}
                onPlayPause={handlePlayPause}
                onSpeedChange={setPlaybackSpeed}
                timezone={selectedTimezone}
              />
            </div>
          </div>

          {/* Analytics Panel Overlay - Toggleable */}
          {showAnalytics && (
            <>
              {/* Desktop Analytics Panel */}
              <div className="hidden lg:block absolute top-20 right-6 bottom-24 w-96 max-h-[calc(100vh-200px)] overflow-y-auto z-10">
                <div className="relative">
                  <button
                    onClick={() => setShowAnalytics(false)}
                    className="absolute -top-2 -right-2 z-20 bg-gray-900/80 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-gray-800 text-xl"
                  >
                    ×
                  </button>
                  <SunlightAnalytics
                    timeline={timeline}
                    currentPoint={timeline.points[currentIndex]}
                  />
                </div>
              </div>

              {/* Mobile Analytics Panel */}
              <div className="lg:hidden absolute top-24 left-4 right-4 bottom-24 overflow-y-auto z-20">
                <div className="relative">
                  <button
                    onClick={() => setShowAnalytics(false)}
                    className="absolute -top-2 -right-2 z-20 bg-gray-900/80 backdrop-blur-sm text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-800 text-2xl"
                  >
                    ×
                  </button>
                  <SunlightAnalytics
                    timeline={timeline}
                    currentPoint={timeline.points[currentIndex]}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;


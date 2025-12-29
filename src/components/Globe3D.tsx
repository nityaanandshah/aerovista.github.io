import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
import { FlightTimeline, TimelinePoint } from '@/utils/timeline';

interface Globe3DProps {
  timeline: FlightTimeline | null;
  currentPointIndex: number;
  onPointHover?: (point: TimelinePoint | null) => void;
  onPointClick?: (index: number) => void;
}

/**
 * Convert sun azimuth/altitude to 3D Cartesian coordinates
 */
function calculateSunPosition3D(
  azimuth: number,
  altitude: number,
  distance: number = 500
): { x: number; y: number; z: number } {
  const azimuthRad = (azimuth - 90) * Math.PI / 180;
  const altitudeRad = altitude * Math.PI / 180;

  return {
    x: distance * Math.cos(altitudeRad) * Math.cos(azimuthRad),
    y: distance * Math.sin(altitudeRad),
    z: distance * Math.cos(altitudeRad) * Math.sin(azimuthRad)
  };
}

/**
 * Setup lighting for the 3D scene
 */
function setupLighting(globe: any) {
  try {
    const scene = globe.scene();
    
    if (!scene) {
      console.error('[Globe3D] Scene is undefined!');
      return;
    }

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(100, 50, 100);
    sunLight.name = 'sunLight';
    scene.add(sunLight);

    const backLight = new THREE.DirectionalLight(0x6666ff, 0.3);
    backLight.position.set(-100, -50, -100);
    scene.add(backLight);
  } catch (error) {
    console.error('[Globe3D] Error setting up lighting:', error);
  }
}

/**
 * Configure camera controls
 */
function setupControls(globe: any) {
  try {
    const controls = globe.controls();
    
    if (!controls) {
      console.error('[Globe3D] Controls are undefined!');
      return;
    }
    
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controls.minDistance = 120; // Allow closer zoom
    controls.maxDistance = 1000; // Allow farther zoom out
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
  } catch (error) {
    console.error('[Globe3D] Error setting up controls:', error);
  }
}

export function Globe3D({ 
  timeline, 
  currentPointIndex, 
  onPointHover, 
  onPointClick 
}: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [isGlobeReady, setIsGlobeReady] = useState(false);

  // Initialize globe
  useEffect(() => {
    if (!containerRef.current) {
      console.error('[Globe3D] Container ref is null');
      return;
    }

    try {
      // Get container dimensions
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // Create globe with explicit dimensions
      const globe = Globe()(containerRef.current)
        .width(width)
        .height(height);
      
      // Store reference immediately
      globeRef.current = globe;

      // Wait for next tick to ensure globe is mounted
      setTimeout(() => {
        try {
          globe
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
            .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
            .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
            .showAtmosphere(true)
            .atmosphereColor('lightskyblue')
            .atmosphereAltitude(0.15);

          const camera = globe.camera();
          if (camera) {
            camera.position.z = 250; // Closer for better view
          } else {
            console.error('[Globe3D] Camera is undefined!');
          }

          setupLighting(globe);
          setupControls(globe);
          
          console.log('[Globe3D] ✅ Initialization complete');
          setIsGlobeReady(true);
          
        } catch (error) {
          console.error('[Globe3D] Error during initialization:', error);
        }
      }, 100);

    } catch (error) {
      console.error('[Globe3D] Error creating globe:', error);
    }

    // Handle window resize
    const handleResize = () => {
      if (globeRef.current && containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        globeRef.current.width(width).height(height);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeRef.current) {
        try {
          globeRef.current._destructor();
        } catch (error) {
          console.error('[Globe3D] Error during cleanup:', error);
        }
      }
    };
  }, []);

  // Render flight path and markers
  useEffect(() => {
    if (!isGlobeReady || !globeRef.current) {
      return;
    }
    
    if (!timeline) {
      try {
        globeRef.current
          .arcsData([])
          .pointsData([])
          .htmlElementsData([]);
      } catch (error) {
        console.error('[Globe3D] Error clearing data:', error);
      }
      return;
    }

    console.log('[Globe3D] Rendering timeline with', timeline.points.length, 'points');

    try {
      const globe = globeRef.current;

      // Validate timeline data
      if (!timeline.points || timeline.points.length === 0) {
        console.error('[Globe3D] Timeline has no points!');
        return;
      }

      const pathSegments = [];
      for (let i = 0; i < timeline.points.length - 1; i++) {
        const current = timeline.points[i];
        const next = timeline.points[i + 1];
        
        if (!current || !next) {
          console.warn('[Globe3D] Invalid point at index', i);
          continue;
        }
        
        pathSegments.push({
          startLat: current.lat,
          startLng: current.lon,
          endLat: next.lat,
          endLng: next.lon,
          isDaylight: current.isDaylight,
          index: i
        });
      }

      // Format time for display
      const formatTime = (date: Date) => {
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });
      };

      // Create pulsing markers with rings
      const originPoint = timeline.points[0];
      const destPoint = timeline.points[timeline.points.length - 1];
      
      const markers = [
        {
          lat: originPoint.lat,
          lng: originPoint.lon,
          label: `
            <div style="background: rgba(0,0,0,0.9); padding: 12px; border-radius: 8px; border: 2px solid #00d2ff; min-width: 250px;">
              <div style="color: #00d2ff; font-weight: bold; font-size: 14px; margin-bottom: 8px;">🛫 ORIGIN</div>
              <div style="color: white; font-size: 12px; line-height: 1.6;">
                <div><strong>Airport:</strong> ${timeline.origin.name || 'Unknown'}</div>
                <div><strong>IATA:</strong> ${timeline.origin.iata || 'N/A'}</div>
                <div><strong>Location:</strong> ${originPoint.lat.toFixed(4)}°, ${originPoint.lon.toFixed(4)}°</div>
                <div><strong>Departure:</strong> ${formatTime(originPoint.timestamp)}</div>
              </div>
            </div>
          `,
          color: '#00d2ff', // Bright blue
          size: 60
        },
        {
          lat: destPoint.lat,
          lng: destPoint.lon,
          label: `
            <div style="background: rgba(0,0,0,0.9); padding: 12px; border-radius: 8px; border: 2px solid #ff3333; min-width: 250px;">
              <div style="color: #ff3333; font-weight: bold; font-size: 14px; margin-bottom: 8px;">🛬 DESTINATION</div>
              <div style="color: white; font-size: 12px; line-height: 1.6;">
                <div><strong>Airport:</strong> ${timeline.destination.name || 'Unknown'}</div>
                <div><strong>IATA:</strong> ${timeline.destination.iata || 'N/A'}</div>
                <div><strong>Location:</strong> ${destPoint.lat.toFixed(4)}°, ${destPoint.lon.toFixed(4)}°</div>
                <div><strong>Arrival:</strong> ${formatTime(destPoint.timestamp)}</div>
              </div>
            </div>
          `,
          color: '#ff3333', // Bright red
          size: 60
        }
      ];

      // Add rings around the markers for better visibility
      const rings = [
        {
          lat: timeline.points[0].lat,
          lng: timeline.points[0].lon,
          maxR: 8,
          propagationSpeed: 2,
          repeatPeriod: 1000,
          color: '#00d2ff'
        },
        {
          lat: timeline.points[timeline.points.length - 1].lat,
          lng: timeline.points[timeline.points.length - 1].lon,
          maxR: 8,
          propagationSpeed: 2,
          repeatPeriod: 1000,
          color: '#ff3333'
        }
      ];

      globe
        .arcsData(pathSegments)
        .arcColor((d: any) => d.isDaylight ? '#4fc3f7' : '#1e88e5') // Light blue for day, darker blue for night
        .arcAltitude(0) // Flat on the surface - no 3D ribbon effect
        .arcStroke(1.2) // Thinner, more elegant line
        .arcDashLength(1)
        .arcDashGap(0)
        .arcDashAnimateTime(0)
        .arcAltitudeAutoScale(0) // Ensure it stays flat at all zoom levels
        .pointsData(markers)
        .pointAltitude(0.05)
        .pointRadius((d: any) => d.size / 80)
        .pointColor((d: any) => d.color)
        .pointLabel((d: any) => d.label)
        .pointResolution(12)
        .ringsData(rings)
        .ringColor((d: any) => () => d.color)
        .ringMaxRadius((d: any) => d.maxR)
        .ringPropagationSpeed((d: any) => d.propagationSpeed)
        .ringRepeatPeriod((d: any) => d.repeatPeriod)
        .htmlElementsData([]);

      const midPoint = timeline.points[Math.floor(timeline.points.length / 2)];
      globe.pointOfView({
        lat: midPoint.lat,
        lng: midPoint.lon,
        altitude: 1.8 // Closer view to see more detail
      }, 1000);
      
      console.log('[Globe3D] ✅ Route visualization complete');

    } catch (error) {
      console.error('[Globe3D] Error rendering timeline:', error);
    }

  }, [timeline, isGlobeReady]);

  // Update aircraft position and sun
  useEffect(() => {
    if (!isGlobeReady || !globeRef.current || !timeline) {
      return;
    }

    if (currentPointIndex < 0 || currentPointIndex >= timeline.points.length) {
      // Only log if it's an unexpected value (not just "not ready yet")
      if (currentPointIndex !== 0 || timeline.points.length > 0) {
        console.warn('[Globe3D] Invalid point index:', currentPointIndex, 'of', timeline.points.length);
      }
      try {
        globeRef.current.htmlElementsData([]);
      } catch (error) {
        console.error('[Globe3D] Error clearing aircraft:', error);
      }
      return;
    }

    try {
      const globe = globeRef.current;
      const scene = globe.scene();
      
      if (!scene) {
        console.error('[Globe3D] Scene is undefined!');
        return;
      }
      
      const currentPoint = timeline.points[currentPointIndex];
      
      if (!currentPoint) {
        console.error('[Globe3D] Current point is undefined at index', currentPointIndex);
        return;
      }

      // Update aircraft - pass all needed data
      const aircraftData = {
        lat: currentPoint.lat ?? 0,
        lng: currentPoint.lon ?? 0,
        altitude: 0.03, // Higher altitude for better visibility
        heading: currentPoint.heading ?? 0
      };
      
      globe
        .htmlElementsData([aircraftData])
        .htmlElement((d: any) => {
          const el = document.createElement('div');
          el.style.pointerEvents = 'none';
          
          // Create sleek, prominent aircraft SVG icon
          el.innerHTML = `
            <svg width="56" height="56" viewBox="0 0 56 56" style="transform: rotate(${d.heading || 0}deg); filter: drop-shadow(0 0 6px rgba(0, 212, 255, 0.9)) drop-shadow(0 0 12px rgba(0, 212, 255, 0.6));">
              <g transform="translate(28,28)">
                <!-- Main fuselage -->
                <path d="M 0,-20 L 3,-14 L 3,14 L 2,17 L -2,17 L -3,14 L -3,-14 Z" 
                      fill="#ffffff" stroke="#00d4ff" stroke-width="1.5"/>
                <!-- Wings -->
                <path d="M -3,0 L -20,6 L -20,9 L -3,6 Z" 
                      fill="#ffffff" stroke="#00d4ff" stroke-width="1"/>
                <path d="M 3,0 L 20,6 L 20,9 L 3,6 Z" 
                      fill="#ffffff" stroke="#00d4ff" stroke-width="1"/>
                <!-- Tail wings -->
                <path d="M -2,14 L -7,20 L -4,20 L -2,17 Z" 
                      fill="#ffffff" stroke="#00d4ff" stroke-width="1"/>
                <path d="M 2,14 L 7,20 L 4,20 L 2,17 Z" 
                      fill="#ffffff" stroke="#00d4ff" stroke-width="1"/>
                <!-- Vertical stabilizer -->
                <path d="M -1,14 L 0,22 L 1,14 Z" 
                      fill="#ffffff" stroke="#00d4ff" stroke-width="1"/>
                <!-- Cockpit with glow -->
                <circle cx="0" cy="-16" r="2.5" fill="#00d4ff" opacity="1"/>
                <circle cx="0" cy="-16" r="1.5" fill="#ffffff" opacity="0.9"/>
                <!-- Wing lights -->
                <circle cx="-15" cy="6" r="1.2" fill="#ff0080" opacity="0.8"/>
                <circle cx="15" cy="6" r="1.2" fill="#00ff00" opacity="0.8"/>
              </g>
            </svg>
          `;
          
          return el;
        });

      // Update sun position
      if (typeof currentPoint.sunAzimuth === 'number' && typeof currentPoint.sunAltitude === 'number') {
        const sunPos = calculateSunPosition3D(
          currentPoint.sunAzimuth,
          currentPoint.sunAltitude
        );

        const sunLight = scene.children.find(
          (child: any) => child.name === 'sunLight'
        );

        if (sunLight) {
          sunLight.position.set(sunPos.x, sunPos.y, sunPos.z);
        }

        // Remove old sun
        const oldSun = scene.getObjectByName('sunGroup');
        if (oldSun) scene.remove(oldSun);

        // Create simple sun sphere - no rays, no glow, no effects
        const sunGeometry = new THREE.SphereGeometry(15, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xffdd00
        });
        const sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
        sunSphere.name = 'sunGroup'; // Keep same name for cleanup

        // Position the sun
        const sunVisualPos = calculateSunPosition3D(
          currentPoint.sunAzimuth,
          currentPoint.sunAltitude,
          400
        );
        sunSphere.position.set(sunVisualPos.x, sunVisualPos.y, sunVisualPos.z);
        
        scene.add(sunSphere);
      }

    } catch (error) {
      console.error('[Globe3D] Error updating aircraft/sun:', error);
    }

  }, [currentPointIndex, timeline, isGlobeReady]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ background: '#000' }}
    />
  );
}

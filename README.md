# AeroVista

**Choose the perfect window seat based on sun exposure**

---

## 🎯 Problem Statement

Choosing a window seat on a flight is often a gamble. Passengers have no way to know:

- Which side of the aircraft will get direct sunlight during the flight
- When they'll experience sunrise or sunset from their window
- Whether they'll have harsh glare or comfortable viewing conditions
- How sun exposure changes throughout the journey

AeroVista solves this by visualizing real-time sun exposure for any flight route, helping travelers make informed decisions about their window seat selection (left vs right side).

---

## Features

### Interactive 3D Globe Visualization

- Real-time flight path rendering on a 3D Earth
- Dynamic day/night visualization with atmospheric effects
- Smooth camera controls and rotation

### Timeline & Playback Controls

- Scrub through your entire flight timeline
- Playback controls with adjustable speed (0.5x, 1x, 2x)
- Visual markers for sunrise and sunset events
- Day/night gradient showing light conditions

### Sun Exposure Analysis

- **Aircraft Side Visualization**: See which side of the plane (left/right) receives sunlight at any moment
- **Window Recommendations**: Strategic advice on best seats for viewing experiences
- **Sunrise/Sunset Tracking**: Know exactly when and where these events occur during your flight

### Flight Analytics Panel

- Real-time sun position and exposure metrics
- Flight statistics (distance, duration, current position)
- Visual aircraft diagram showing sunlight direction
- Full flight sun exposure breakdown (left side, right side, overhead, darkness)
- Intelligent recommendations for photography and viewing opportunities

### Global Timezone Support

- Choose from 40+ major timezones worldwide
- Automatic UTC conversion for accurate calculations
- Includes IST, EST, PST, JST, and many more

### Modern Dark UI

- Space-themed aesthetic matching the globe visualization
- Semi-transparent overlays with backdrop blur effects
- Responsive design for all screen sizes

---

## Tech Stack

### Frontend Framework

- **React 18** - Component-based UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server

### Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library

### 3D Visualization

- **globe.gl** - 3D globe rendering (Three.js wrapper)
- **Three.js** - WebGL 3D graphics library

### Computational Logic

- **Solar Position Algorithms** - Jean Meeus astronomical calculations
- **Geodesic Mathematics** - Haversine formula for great-circle routes
- **Aircraft Sun Exposure Logic** - Custom bearing and angle calculations

### Data

- **60+ Major Airports** - Curated global airport database
- **40+ Timezones** - Comprehensive timezone support

---

## How to Start the Project

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd AeroVista

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

The app will be available at: `http://localhost:5173/`

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

### Usage

1. **Enter Flight Details**

   - Select origin airport (search by city, code, or name)
   - Select destination airport
   - Choose departure date and time
   - Select your timezone

2. **Calculate Route**

   - Click "Calculate Flight Route" button
   - Watch the 3D globe render your flight path

3. **Explore Sun Exposure**

   - Use the timeline scrubber to move through the flight
   - Click the info icon (next to route) to view analytics
   - See which side gets sunlight at each point
   - Get recommendations for best viewing experiences

4. **Playback Controls**
   - Play/pause the flight animation
   - Adjust speed (0.5x, 1x, 2x)
   - Skip to start or end of flight
   - Hover over sun markers for sunrise/sunset times


# Rover Monitoring System - Setup Guide

## Overview

The Agricultural Rover Monitoring System is a comprehensive feature that allows farmers to monitor their crops using autonomous rovers. The system provides:

- **Real-time GPS tracking** on Google Maps satellite view
- **Live sensor data** (temperature, humidity, soil moisture, crop health)
- **Autonomous patrol mode** for automatic field monitoring
- **Manual control** to direct rovers to specific locations
- **Route tracking** to visualize rover paths across the land
- **Harvest readiness tracker** for farmer-confirmed ripe and unripe fruit/vegetable counts by crop

The harvest readiness tracker can poll a rover-mounted camera snapshot endpoint, capture a field frame for model
analysis, and record farmer-reviewed crop/ripeness counts. Its optional TensorFlow model is trained and served
separately; dataset format, public mango/banana dataset download, model training, and API setup are documented in
[ml/ripeness/README.md](./ml/ripeness/README.md). The model predicts one crop and ripeness label per image; it does not
detect or count every item in a field frame. Confirmed counts are stored in the current browser and are not shared
across devices.

### Rover-mounted Camera Feed

The rover must expose an HTTP or HTTPS URL that returns a single JPEG (or other image) when requested. On the Rover
Monitoring page, enter that URL under **Rover field camera** and select **Connect rover camera**. The dashboard
requests a fresh image every 2 seconds; select **Use latest rover frame** to review it, then **Analyze with trained
model** to get a crop/ripeness suggestion. Confirm the result and enter the number of produce items yourself before
saving a harvest observation.

The endpoint must be reachable from the browser and allow cross-origin requests from the dashboard (CORS). For
example, a rover camera server on the local network could expose
`http://192.168.4.1/capture` and return `Content-Type: image/jpeg`. HTTPS deployments should use an HTTPS camera
endpoint to avoid browser mixed-content restrictions. The existing rover sensor WebSocket does not transmit images.
If the hardware currently exposes only a video stream or a different protocol, it needs a small rover-side snapshot
endpoint/bridge; a stream URL cannot be used as the JPEG snapshot URL directly.

For a dashboard preview, select **Load sample data** in **Field totals by crop**. These example counts are labeled as
demo data and can be removed without deleting farmer-confirmed observations.

## Installation & Setup

### 1. Install Dependencies

First, ensure all required npm packages are installed:

```bash
npm install
```

The following packages have been added for this feature:
- `@react-google-maps/api` - React wrapper for Google Maps API
- `@googlemaps/js-api-loader` - Google Maps JS API loader

### 2. Get Google Maps API Key

The Rover Monitoring system requires a Google Maps API key:

#### Steps to get your API Key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Search for "Maps JavaScript API" and enable it
4. Go to "Credentials" and create an API key
5. Restrict the key to "Maps JavaScript API"
6. Copy your API key

### 3. Configure Environment Variables

Create a `.env.local` file in your project root (if not already present):

```env
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

Or set the variable in your build configuration:

```bash
# For development
export REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_API_KEY
npm run dev
```

### Connect Arduino Sensor Values over USB

The Rover Monitor reads live sensor data from the Arduino through the Python WebSocket bridge. The bridge defaults to `COM7` and accepts the labeled format:

```text
Soil Moisture Value: 1019 | Temperature: 31.60 C | Humidity: 68.00 % | Distance: 346.45 cm
```

On Windows, keep the frontend and bridge running in separate terminals from the project folder:

1. Close the Arduino IDE Serial Monitor. Only one program can read the Arduino's USB serial port at a time.
2. Install the Python dependencies once: `py -m pip install pyserial websockets`.
3. Start the bridge: `py rover-backend/server.py`.
4. Start the frontend in another terminal: `npm run dev -- --port 5173`.
5. Open the Rover Monitoring page in the browser. The status changes to Live when the browser connects to the bridge.

If Windows assigns a different port, set it before starting the bridge in PowerShell, for example `$env:ROVER_COM_PORT = "COM6"`. The soil reading is displayed as a raw ADC value; converting it to a percentage requires calibrating the soil sensor.

### 4. Update RoverMonitoring Component

In `src/pages/RoverMonitoring.tsx`, update the Google Maps API key line:

```typescript
// Replace this:
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

// With your actual API key or ensure the environment variable is set
```

## Features

### 1. Rover Control Panel

The control panel provides two modes:

#### Auto Patrol Mode
- Enables autonomous rover movement
- Rover patrols in a predefined square pattern
- Continuously monitors and collects sensor data
- Useful for systematic field coverage

#### Manual Movement
- Direct rover to specific GPS coordinates (latitude/longitude)
- Useful for targeted inspection of specific areas
- Click "Move to Location" to send rover to coordinates

### 2. Live Monitoring Dashboard

Real-time sensor data displayed includes:

| Sensor | Range | Purpose |
|--------|-------|---------|
| **Temperature** | 0-50°C | Monitor ambient temperature |
| **Humidity** | 0-100% | Track air moisture levels |
| **Soil Moisture** | 0-100% | Monitor irrigation needs |
| **Crop Health** | 0-100% | Assess overall crop condition |
| **Battery** | 0-100% | Track rover power levels |

### 3. Interactive Map

- **Satellite View**: Shows real-time crop imagery
- **Current Position**: Green marker shows rover location
- **Route Path**: Blue line shows rover's traveled path
- **Checkpoints**: Orange markers show previously monitored areas
- **Info Window**: Click the rover marker for detailed position info

### 4. Status Indicators

- 🟢 **Green**: Optimal conditions
- 🟡 **Yellow**: Warning conditions
- 🔴 **Red**: Critical conditions (low battery, poor health)

## Usage Guide

### Starting Patrol Mode

1. Navigate to "🤖 Rover" in the header menu
2. Click "Start Patrol" in the Auto Patrol Mode section
3. Rover begins moving in a square pattern
4. Real-time sensor data updates every 2 seconds
5. Route is displayed on the map

### Manual Navigation

1. Enter specific latitude and longitude values
2. Click "Move to Location"
3. Rover navigates to the specified coordinates
4. Monitoring data is collected at the destination

### Monitoring Data

- All sensor readings update automatically during operation
- Battery decreases with rover movement (0.5% per move)
- Sensor readings are streamed from the Arduino over USB when the Python bridge is running; approximate values appear while it is offline
- Historical route is maintained and displayed

### Route Management

- **Clear Route**: Removes all waypoints, keeps current position
- **Stop Monitoring**: Halts active monitoring operations
- Routes can contain hundreds of waypoints for extensive monitoring

## Technical Architecture

### Context API (RoverContext)

Manages global rover state:

```typescript
interface RoverState {
  position: RoverPosition;      // Current GPS coordinates
  battery: number;              // Battery percentage
  isMoving: boolean;            // Movement status
  heading: number;              // Direction in degrees
  monitoringData: MonitoringData;
  route: RoverPosition[];       // Path history
}
```

### Components

1. **RoverMonitoring.tsx** - Main page component
2. **RoverMap.tsx** - Google Maps integration and visualization
3. **RoverControls.tsx** - Control panel and monitoring dashboard

### Dependencies

```json
{
  "@react-google-maps/api": "^2.20.0",
  "@googlemaps/js-api-loader": "^1.16.0"
}
```

## Integration with Existing Features

The rover monitoring system integrates with:

- **Authentication**: Protected route requiring login
- **Context Providers**: Uses existing CartProvider, AuthProvider, LanguageProvider
- **UI Components**: Utilizes existing Radix UI components
- **Header Navigation**: Added "🤖 Rover" button in main navigation

## Customization

### Change Default Location

Edit `RoverContext.tsx`:

```typescript
const [rover, setRover] = useState<RoverState>({
  position: { lat: 13.3527, lng: 74.7421 }, // Your coordinates
  // ...
});
```

### Adjust Patrol Pattern

Modify the auto-movement logic in `RoverControls.tsx`:

```typescript
// Change step increments for different patrol sizes
const offset = 0.001; // ~111 meters per step
```

### Integrate Real Sensors

Replace mock data generation in `RoverContext.tsx`:

```typescript
const startMonitoring = useCallback(() => {
  // Replace with real API calls to sensor data
  // Example: const data = await fetchSensorData(rover.position);
  setRover((prev) => ({
    ...prev,
    monitoringData: realSensorData, // Instead of simulated data
  }));
}, []);
```

## API Integration Examples

### Connect to Real GPS Device

```typescript
// In RoverControls or RoverMap
useEffect(() => {
  const connection = new WebSocket('ws://rover-server:8080');
  connection.onmessage = (event) => {
    const data = JSON.parse(event.data);
    moveRover(data.latitude, data.longitude);
  };
}, [moveRover]);
```

### Backend Sensor Data Integration

```typescript
// Replace simulated data with real API calls
const fetchMonitoringData = async (position: RoverPosition) => {
  const response = await fetch('/api/sensors/data', {
    method: 'POST',
    body: JSON.stringify({ lat: position.lat, lng: position.lng })
  });
  return response.json();
};
```

## Troubleshooting

### Google Maps Not Displaying

1. Verify API key is correctly set in `.env.local`
2. Check API key has "Maps JavaScript API" enabled
3. Ensure domain is whitelisted in Google Cloud Console
4. Check browser console for error messages

### Battery Not Decreasing

- Verify `moveRover` is being called
- Check the battery decrement logic in RoverContext

### Sensor Data Not Updating

- Confirm monitoring is active (check `isMoving` status)
- Verify the simulation interval is running (2-second default)

### Map Not Centering on Rover

- Check that mapRef is properly initialized
- Verify coordinates are within valid range (±90°, ±180°)

## Future Enhancements

1. **Real Rover Hardware Integration**
   - Connect to actual rover via WebSocket/Serial
   - Live video feed from rover camera

2. **Advanced Analytics**
   - Crop health trends over time
   - AI-powered disease detection
   - Predictive irrigation recommendations

3. **Multi-Rover Support**
   - Coordinate multiple rovers on same land
   - Distributed monitoring coverage

4. **Data Persistence**
   - Store historical monitoring data
   - Generate comprehensive field reports
   - Export data for analysis

5. **Mobile App**
   - Native mobile app for on-site monitoring
   - Offline mode with local storage

## Support & Resources

- [Google Maps API Documentation](https://developers.google.com/maps/documentation)
- [React Google Maps API](https://react-google-maps-api-docs.netlify.app/)
- [AgriAssist Village Documentation](../README.md)

## Notes

- Sensor data is currently simulated for demonstration purposes
- Default location is set to Mangalore, India (13.3527°N, 74.7421°E)
- Patrol mode creates a square pattern with ~111-meter sides
- Battery consumption is 0.5% per movement action

---

**Version**: 1.0  
**Last Updated**: May 2026  
**Author**: AgriAssist Development Team

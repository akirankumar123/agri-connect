import React, {
  createContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";

export interface RoverPosition {
  lat: number;
  lng: number;
}

export interface MonitoringData {
  temperature: number | null;
  humidity: number | null;
  soilMoisture: number | null;
  distance: number | null;
  cropHealth: number;
  timestamp: Date;
}

export type SensorConnectionStatus = "connecting" | "connected" | "disconnected";

export interface RoverState {
  position: RoverPosition;
  battery: number;
  isMoving: boolean;
  heading: number;
  monitoringData: MonitoringData;
  route: RoverPosition[];
}

export interface RoverContextType {
  rover: RoverState;
  sensorConnection: SensorConnectionStatus;
  moveRover: (lat: number, lng: number) => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  setBattery: (battery: number) => void;
  clearRoute: () => void;
  updateHeading: (heading: number) => void;
}

const RoverContext = createContext<RoverContextType | undefined>(
  undefined
);

export const RoverProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [sensorConnection, setSensorConnection] = useState<SensorConnectionStatus>("connecting");
  const [rover, setRover] = useState<RoverState>({
    position: {
      lat: 13.3527,
      lng: 74.7421,
    },

    battery: 100,

    isMoving: false,

    heading: 0,

    monitoringData: {
      temperature: null,
      humidity: null,
      soilMoisture: null,
      distance: null,
      cropHealth: 85,
      timestamp: new Date(),
    },

    route: [
      {
        lat: 13.3527,
        lng: 74.7421,
      },
    ],
  });

  // =====================================================
  // REAL-TIME ARDUINO CONNECTION
  // =====================================================

  useEffect(() => {
    console.log("Connecting to Rover Python server...");
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    let socket: WebSocket;

    const connect = () => {
      if (disposed) return;
      setSensorConnection("connecting");
      socket = new WebSocket("ws://localhost:8765");

      socket.onopen = () => setSensorConnection("connected");

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const readNumber = (value: unknown) => {
            if (value === undefined || value === null) return undefined;
            const number = Number(value);
            return Number.isFinite(number) ? number : undefined;
          };
          const soilMoisture = readNumber(data.soilMoisture ?? data.soil);
          const temperature = readNumber(data.temperature);
          const humidity = readNumber(data.humidity);
          const distance = readNumber(data.distance);

          if ([soilMoisture, temperature, humidity, distance].every((value) => value === undefined)) return;

          setRover((prev) => ({
            ...prev,
            monitoringData: {
              soilMoisture: soilMoisture ?? prev.monitoringData.soilMoisture,
              temperature: temperature ?? prev.monitoringData.temperature,
              humidity: humidity ?? prev.monitoringData.humidity,
              distance: distance ?? prev.monitoringData.distance,
              cropHealth: prev.monitoringData.cropHealth,
              timestamp: new Date(),
            },
          }));
        } catch (error) {
          console.error("Error reading sensor data:", error);
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        setSensorConnection("disconnected");
        retryTimer = setTimeout(connect, 2000);
      };

      socket.onerror = () => socket.close();
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);


  // =====================================================
  // MOVE ROVER
  // =====================================================

  const moveRover = useCallback(
    (lat: number, lng: number) => {
      setRover((prev) => {
        const prevLat = prev.position.lat;
        const prevLng = prev.position.lng;

        const heading =
          Math.atan2(
            lng - prevLng,
            lat - prevLat
          ) *
          (180 / Math.PI);

        return {
          ...prev,

          position: {
            lat,
            lng,
          },

          heading: heading,

          battery: Math.max(
            0,
            prev.battery - 0.5
          ),

          route: [
            ...prev.route,
            {
              lat,
              lng,
            },
          ],
        };
      });
    },
    []
  );


  // =====================================================
  // START MONITORING
  // =====================================================

  const startMonitoring = useCallback(() => {
    setRover((prev) => ({
      ...prev,
      isMoving: true,
    }));
  }, []);


  // =====================================================
  // STOP MONITORING
  // =====================================================

  const stopMonitoring = useCallback(() => {
    setRover((prev) => ({
      ...prev,
      isMoving: false,
    }));
  }, []);


  // =====================================================
  // BATTERY
  // =====================================================

  const setBattery = useCallback(
    (battery: number) => {
      setRover((prev) => ({
        ...prev,

        battery: Math.min(
          100,
          Math.max(0, battery)
        ),
      }));
    },
    []
  );


  // =====================================================
  // CLEAR ROUTE
  // =====================================================

  const clearRoute = useCallback(() => {
    setRover((prev) => ({
      ...prev,

      route: [
        prev.position,
      ],
    }));
  }, []);


  // =====================================================
  // HEADING
  // =====================================================

  const updateHeading = useCallback(
    (heading: number) => {
      setRover((prev) => ({
        ...prev,

        heading:
          ((heading % 360) + 360) % 360,
      }));
    },
    []
  );


  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const value: RoverContextType = {
    rover,
    sensorConnection,

    moveRover,

    startMonitoring,

    stopMonitoring,

    setBattery,

    clearRoute,

    updateHeading,
  };


  return (
    <RoverContext.Provider value={value}>
      {children}
    </RoverContext.Provider>
  );
};


// =====================================================
// USE ROVER
// =====================================================

export const useRover = (): RoverContextType => {
  const context = React.useContext(
    RoverContext
  );

  if (!context) {
    throw new Error(
      "useRover must be used within RoverProvider"
    );
  }

  return context;
};
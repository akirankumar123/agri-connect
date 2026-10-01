import { useEffect, useState } from "react";

function RoverMonitor() {

  const [sensorData, setSensorData] = useState({
    soil: 0,
    temperature: 0,
    humidity: 0,
    distance: 0
  });

  const [connected, setConnected] = useState(false);

  useEffect(() => {

    // Connect React to Python
    const socket = new WebSocket("ws://localhost:8765");

    // Connected
    socket.onopen = () => {
      console.log("Connected to Rover Server");
      setConnected(true);
    };

    // Receive Arduino sensor data
    socket.onmessage = (event) => {

      console.log("Received:", event.data);

      const data = JSON.parse(event.data);

      setSensorData(data);
    };

    // Disconnected
    socket.onclose = () => {
      console.log("Rover Server disconnected");
      setConnected(false);
    };

    // Error
    socket.onerror = (error) => {
      console.log("WebSocket error:", error);
      setConnected(false);
    };

    // Close connection when page closes
    return () => {
      socket.close();
    };

  }, []);


  return (
    <div style={{
      padding: 0,
      margin: 0,
      fontFamily: "Arial"
    }}>

      <h1>🚜 Agri-Assist Rover Monitor</h1>

      <h3>
        Status:{" "}

        {connected ? (
          <span style={{ color: "green" }}>
            🟢 Connected
          </span>
        ) : (
          <span style={{ color: "red" }}>
            🔴 Disconnected
          </span>
        )}

      </h3>


      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "20px",
        marginTop: "30px"
      }}>


        {/* SOIL */}

        <div style={{
          padding: "25px",
          border: "1px solid #ddd",
          borderRadius: "15px"
        }}>

          <h2>🌱 Soil Moisture</h2>

          <h1>
            {sensorData.soil}
          </h1>

        </div>


        {/* TEMPERATURE */}

        <div style={{
          padding: "25px",
          border: "1px solid #ddd",
          borderRadius: "15px"
        }}>

          <h2>🌡️ Temperature</h2>

          <h1>
            {sensorData.temperature} °C
          </h1>

        </div>


        {/* HUMIDITY */}

        <div style={{
          padding: "25px",
          border: "1px solid #ddd",
          borderRadius: "15px"
        }}>

          <h2>💧 Humidity</h2>

          <h1>
            {sensorData.humidity} %
          </h1>

        </div>


        {/* DISTANCE */}

        <div style={{
          padding: "25px",
          border: "1px solid #ddd",
          borderRadius: "15px"
        }}>

          <h2>📏 Distance</h2>

          <h1>
            {sensorData.distance} cm
          </h1>

        </div>

      </div>

    </div>
  );
}

export default RoverMonitor;
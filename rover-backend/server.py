import serial
import asyncio
import websockets
import json
import re
import os

# =====================================================
# ARDUINO SETTINGS
# =====================================================

COM_PORT = os.getenv("ROVER_COM_PORT", "COM7")
BAUD_RATE = 9600

# =====================================================
# CONNECT TO ARDUINO
# =====================================================

try:
    arduino = serial.Serial(
        COM_PORT,
        BAUD_RATE,
        timeout=1
    )

    print("===================================")
    print("      AGRI-ASSIST ROVER SERVER")
    print("===================================")
    print(f"Arduino connected: {COM_PORT}")
    print(f"Baud rate: {BAUD_RATE}")
    print("Waiting for sensor data...")
    print()

except serial.SerialException as error:

    print("ERROR: Could not connect to Arduino.")
    print(f"Port: {COM_PORT}")
    print(error)
    print()
    print("Make sure:")
    print("1. Arduino is connected")
    print(f"2. Arduino is using {COM_PORT}")
    print("3. Arduino Serial Monitor is CLOSED")
    print(f"4. No other program is using {COM_PORT}")

    exit()


# =====================================================
# CONNECTED REACT CLIENTS
# =====================================================

clients = set()


# =====================================================
# WEBSOCKET SERVER
# =====================================================

async def websocket_handler(websocket):

    print("React application connected!")

    clients.add(websocket)

    try:
        await websocket.wait_closed()

    except websockets.exceptions.ConnectionClosed:
        pass

    finally:
        clients.discard(websocket)

        print("React application disconnected.")


# =====================================================
# SEND DATA TO REACT
# =====================================================

async def send_to_react(sensor_data):

    if not clients:
        return

    message = json.dumps(sensor_data)

    disconnected = set()

    for client in clients:

        try:

            await client.send(message)

        except websockets.exceptions.ConnectionClosed:

            disconnected.add(client)

        except Exception as error:

            print("WebSocket error:", error)
            disconnected.add(client)

    for client in disconnected:

        clients.discard(client)


# =====================================================
# READ ARDUINO DATA
# =====================================================

async def read_arduino():

    while True:

        try:

            line = arduino.readline().decode(
                "utf-8",
                errors="ignore"
            ).strip()

            if not line:

                await asyncio.sleep(0.01)
                continue

            print("Arduino:", line)

            # =================================================
            # EXPECTED ARDUINO FORMAT
            #
            # Soil Moisture Value: 1023 |
            # Temperature: 30.60 C |
            # Humidity: 47.00 % |
            # Distance: 61.11 cm
            # =================================================

            soil_match = re.search(
                r"Soil Moisture Value:\s*([-+]?\d*\.?\d+)",
                line,
                re.IGNORECASE
            )

            temperature_match = re.search(
                r"Temperature:\s*([-+]?\d*\.?\d+)",
                line,
                re.IGNORECASE
            )

            humidity_match = re.search(
                r"Humidity:\s*([-+]?\d*\.?\d+)",
                line,
                re.IGNORECASE
            )

            distance_match = re.search(
                r"Distance:\s*([-+]?\d*\.?\d+)",
                line,
                re.IGNORECASE
            )

            # =================================================
            # CHECK SENSOR VALUES
            # =================================================

            if not soil_match:
                print("Soil value not found")
                continue

            if not temperature_match:
                print("Temperature value not found")
                continue

            if not humidity_match:
                print("Humidity value not found")
                continue

            # =================================================
            # CONVERT VALUES
            # =================================================

            soil = float(soil_match.group(1))

            temperature = float(
                temperature_match.group(1)
            )

            humidity = float(
                humidity_match.group(1)
            )

            # Distance may be "No object detected"
            if distance_match:

                distance = float(
                    distance_match.group(1)
                )

            else:

                distance = -1


            # =================================================
            # CREATE DATA FOR REACT
            # =================================================

            sensor_data = {

                "soil": soil,

                "soilMoisture": soil,

                "temperature": temperature,

                "humidity": humidity,

                "distance": distance,

                "timestamp": asyncio.get_event_loop().time()
            }


            # =================================================
            # PRINT DATA BEING SENT
            # =================================================

            print(
                f"Sending to React -> "
                f"Soil: {soil} | "
                f"Temperature: {temperature:.2f} C | "
                f"Humidity: {humidity:.2f} % | "
                f"Distance: {distance:.2f} cm"
            )


            # =================================================
            # SEND TO REACT
            # =================================================

            await send_to_react(sensor_data)


        except Exception as error:

            print("Arduino reading error:", error)


        await asyncio.sleep(0.01)


# =====================================================
# MAIN
# =====================================================

async def main():

    server = await websockets.serve(
        websocket_handler,
        "localhost",
        8765
    )

    print("===================================")
    print("WebSocket server started")
    print("Address: ws://localhost:8765")
    print("===================================")
    print()
    print("Waiting for React application...")
    print()

    await read_arduino()


# =====================================================
# START
# =====================================================

try:

    asyncio.run(main())

except KeyboardInterrupt:

    print()
    print("Server stopped.")

finally:

    if arduino.is_open:
        arduino.close()

    print("Arduino connection closed.")
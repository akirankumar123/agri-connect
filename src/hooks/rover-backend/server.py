import serial
import asyncio
import websockets
import json

# =====================================================
# ARDUINO SETTINGS
# =====================================================

COM_PORT = "COM9"
BAUD_RATE = 9600

# Connect to Arduino
try:
    arduino = serial.Serial(
        COM_PORT,
        BAUD_RATE,
        timeout=1
    )

    print("===================================")
    print("   AGRI-ASSIST ROVER SERVER")
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
    print("Check that:")
    print("1. Arduino is connected")
    print("2. Arduino is using COM9")
    print("3. Arduino Serial Monitor is CLOSED")
    print("4. No other program is using COM9")
    exit()


# =====================================================
# CONNECTED WEB CLIENTS
# =====================================================

clients = set()


# =====================================================
# WEBSOCKET CONNECTION
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
# READ DATA FROM ARDUINO
# =====================================================

async def read_arduino():

    while True:

        try:

            # Read one line from Arduino
            line = arduino.readline().decode(
                "utf-8",
                errors="ignore"
            ).strip()

            # Ignore empty lines
            if not line:
                await asyncio.sleep(0.01)
                continue

            print("Arduino:", line)

            # Arduino format:
            #
            # 650,29.0,65.0,35.2
            #
            # soil,temperature,humidity,distance

            values = line.split(",")

            # We need exactly 4 values
            if len(values) != 4:
                print("Invalid sensor data:", line)
                continue

            try:

                soil = float(values[0])
                temperature = float(values[1])
                humidity = float(values[2])
                distance = float(values[3])

            except ValueError:

                print("Could not convert sensor values:", line)
                continue


            # =================================================
            # CREATE DATA FOR REACT
            # =================================================

            sensor_data = {
                "soil": soil,
                "temperature": temperature,
                "humidity": humidity,
                "distance": distance
            }

            # Convert Python dictionary to JSON
            message = json.dumps(sensor_data)


            # =================================================
            # SEND DATA TO ALL REACT CLIENTS
            # =================================================

            if clients:

                disconnected_clients = set()

                for client in clients:

                    try:

                        await client.send(message)

                    except websockets.exceptions.ConnectionClosed:

                        disconnected_clients.add(client)


                # Remove disconnected clients
                for client in disconnected_clients:
                    clients.discard(client)


        except Exception as error:

            print("Arduino reading error:", error)


        await asyncio.sleep(0.01)


# =====================================================
# MAIN PROGRAM
# =====================================================

async def main():

    # Start WebSocket server
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

    # Start reading Arduino
    await read_arduino()


# =====================================================
# START SERVER
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
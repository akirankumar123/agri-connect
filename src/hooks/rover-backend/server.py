import serial

# Arduino COM port
arduino = serial.Serial("COM4", 9600, timeout=1)

print("Connected to Arduino!")
print("Waiting for sensor data...\n")

while True:
    line = arduino.readline().decode("utf-8", errors="ignore").strip()

    if line:
        print("Arduino:", line)
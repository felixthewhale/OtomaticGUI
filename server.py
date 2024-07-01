from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
import serial
import struct
import time
import threading

app = Flask(__name__)
# CORS(app)
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")  # Specify allowed origins for Socket.IO
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # Specify allowed origins for other Flask routes

# Find serial device port with ST-Link  
import serial.tools.list_ports
# writeable only from function "writeConsole"

console_buffer = []

portFound = None
port = None
ser = None
def writeConsole(message):
    global console_buffer
    console_buffer.append([time.time(), message])
    console_buffer = console_buffer[-10:]

def reconnect_serial():
    global portFound
    global ser


    ports = serial.tools.list_ports.comports()
    for port, desc, hwid in sorted(ports):
        # STMicroelectronics STLink Virtual COM Port
        if "STMicroelectronics STLink Virtual COM Port" in desc:
            portFound = port
            print(desc)

    if portFound is None:
        print("UART target device not found. Please connect the device and try again.")
        writeConsole("UART target device not found. Please connect the device and try again.")
        time.sleep(5)
        reconnect_serial()
    else:
        print(f"ST-Link device found at port {portFound}")
        # Open serial port
        ser = serial.Serial(portFound, 115200, timeout=1)
        writeConsole(f"ST-Link device found at port {portFound}")
        ser.flush()
        ser.flushInput()
        ser.flushOutput()        

reconnect_serial()

status = None
# function to get data from serial port
def poll_serial_data():
    global console_buffer
    global status
    while True:
        try:
            if ser.in_waiting:
                data_str = ser.readline()
                # if start byte is 0xFF then safe it to status
                if data_str[0] == 0xFF:
                    status = data_str
                    print(">>status: ", status)
                    continue
                data_line = data_str.decode('utf-8').rstrip()
                print(data_line)
                console_buffer.append([time.time(), data_line])

            else:
                time.sleep(0.5)
        except Exception as e:
            print(f"Error occurred: {e}. Will reconnect shortly...")
            time.sleep(5)

# Start the polling function in a separate thread
polling_thread = threading.Thread(target=poll_serial_data)
polling_thread.daemon = True  # This will allow the thread to exit when main program exits
polling_thread.start()



@app.route("/send", methods=["POST"])
def send_data():
    data = request.json
    print(data)

    try:
        command, motor, value = data["command"], data["motor"], data["value"]

        # Validate the value range for 32-bit signed integer
        if value < -2147483648 or value > 2147483647:
            print("Value out of range for 4-byte representation")
            return jsonify({"message": "Value out of range for 4-byte representation"}), 400

        packed_data = struct.pack('!BBiH', command, motor, value, 0xFFFF)
        if len(packed_data) != 8:
            print("Packed data doesn't match expected buffer size")
            return jsonify({"message": "Packed data doesn't match expected buffer size"}), 400

        ser.write(packed_data)
        return jsonify({"message": "Success"}), 200

    except (ValueError, TypeError):
        return jsonify({"message": "Please enter valid integers for command, motor, and value."}), 400


@app.route("/status", methods=["GET"])
def get_status():
    try:
        global status
        packed_data = struct.pack('!BBiH', 1, 0, 0, 0xFFFF)
        if len(packed_data) != 8:
            return jsonify({"message": "Packed data doesn't match expected buffer size"}), 400

    
        # if not ser.is_open:
            
        ser.write(packed_data)
        time.sleep(0.2)
        print(">>status: ", status)
        if status is None:
            return jsonify({"message": "No status received"}), 400
        if len(status) < 29:
            return jsonify({"message": "Status is too short"}), 400
        # Extract structured data from the first 29 bytes
        structured_bytes = status[:29]
        (
            startByte, controlMode, xAngle, yAngle, 
            xSpeed, ySpeed, xDesiredAngle, yDesiredAngle
        ) = struct.unpack('!Biffffff', structured_bytes)
        # Decode the remaining bytes to extract the text
        text_message = status[29:].decode('utf-8').rstrip()

        # Return as JSON
        return jsonify({
            "message": "Success",
            "data": {
                "startByte": startByte,
                "controlMode": controlMode,
                "DEGX": xAngle,
                "DEGY": yAngle,
                "VELX": xSpeed,
                "VELY": ySpeed,
                "DEZX": xDesiredAngle,
                "DEZY": yDesiredAngle,
                # "textMessage": text_message  # including the text message
            }
        }), 200

    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({"message": "Error"}), 400
   


@app.route("/console", methods=["GET"])
def get_console_data():
    print("Received request for console")
    return jsonify({"data": console_buffer}), 200

@app.route("/receive", methods=["GET"])
def receive_data():
    print("Received request")
    if ser.in_waiting:
        data_str = ser.readline()
        data_line = data_str.decode('utf-8').rstrip()
        return jsonify({"data": data_line}), 200
    else:
        return jsonify({"data": None}), 200

@socketio.on('connect')
def handle_connection():
    print("Socket: Client connected")

# Receive send command from client
@socketio.on('send')
def handle_send(data):
    # print("Socket: Received send command from client")
    # print(data)

    try:
        command, motor, value = data["command"], data["motor"], data["value"]

        # Validate the value range for 32-bit signed integer
        if value < -2147483648 or value > 2147483647:
            print("Value out of range for 4-byte representation")
            return jsonify({"message": "Value out of range for 4-byte representation"}), 400

        packed_data = struct.pack('!BBiH', command, motor, value, 0xFFFF)
        if len(packed_data) != 8:
            print("Packed data doesn't match expected buffer size")
            return jsonify({"message": "Packed data doesn't match expected buffer size"}), 400

        ser.write(packed_data)
        return jsonify({"message": "Success"}), 200

    except (ValueError, TypeError):
        return jsonify({"message": "Please enter valid integers for command, motor, and value."}), 400

@app.route("/notify")
def send_notification():
    message = "Your notification message here."
    socketio.emit("notification", message, broadcast=True)
    return "Notification sent!"

if __name__ == "__main__":
    try:
        # app.run(debug=False)
        socketio.run(app, debug=False)

    except KeyboardInterrupt:
        print("Gracefully shutting down...")
        exit(0)

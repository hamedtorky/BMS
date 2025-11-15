# ESP32-S3 BMS Node with SHT10 Sensor

This example demonstrates how to connect an ESP32-S3 with an SHT10 temperature and humidity sensor to the BMS MQTT server.

## Hardware Requirements

- ESP32-S3 development board
- SHT10 Temperature & Humidity Sensor
- Jumper wires
- USB cable for programming

## Wiring Diagram

```
ESP32-S3          SHT10
---------         -----
GPIO 21    <---->  DATA
GPIO 22    <---->  SCK
3.3V       <---->  VCC
GND        <---->  GND
```

## Required Arduino Libraries

Install these libraries through the Arduino IDE Library Manager:

1. **PubSubClient** by Nick O'Leary
   - For MQTT communication
   
2. **ArduinoJson** by Benoit Blanchon
   - For JSON serialization/deserialization
   
3. **SHT1x** by Practical Arduino
   - For SHT10 sensor readings

## TLS/SSL Security

This example uses **TLS encryption** for secure communication between the ESP32 and the MQTT broker. The CA certificate from your BMS server is embedded in the code for certificate validation.

### How it works:
- The ESP32 connects to port **8883** (MQTT over TLS)
- The connection is encrypted using TLS/SSL
- The CA certificate validates the server's identity
- All data transmitted is encrypted and secure

### Updating the Certificate

If you regenerate your server certificates, you'll need to update the `ca_cert` in the sketch:

1. Get the CA certificate from your server:
   ```bash
   cat mosquitto/certs/ca.crt
   ```

2. Copy the certificate content

3. Replace the `ca_cert` variable in the sketch (lines 35-56)

## Setup Instructions

### 1. Create a Node in BMS Web Panel

1. Log in to the BMS web panel at `http://your-server-ip:8080`
2. Navigate to "Nodes" section
3. Click "Add Node"
4. Fill in the details:
   - **Node ID**: `esp32_01` (or your preferred ID)
   - **Name**: `ESP32-S3 Temperature Sensor`
   - **Address**: Your ESP32 location/description
   - **Description**: `SHT10 temperature and humidity sensor`
5. Click "Save"
6. **IMPORTANT**: Copy the MQTT username and password - they won't be shown again!

### 2. Configure the Arduino Sketch

Open `esp32_sht10.ino` and update the following configuration:

```cpp
// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings
const char* MQTT_SERVER = "192.168.1.100";  // Your BMS server IP
const char* MQTT_USERNAME = "node_esp32_01"; // From BMS web panel
const char* MQTT_PASSWORD = "your_node_password"; // From BMS web panel
const char* NODE_ID = "esp32_01";
```

### 3. Upload to ESP32-S3

1. Connect your ESP32-S3 to your computer via USB
2. Select the correct board: **Tools > Board > ESP32 Arduino > ESP32S3 Dev Module**
3. Select the correct port: **Tools > Port > [Your COM port]**
4. Click **Upload**

### 4. Monitor Serial Output

1. Open Serial Monitor (115200 baud)
2. You should see:
   - WiFi connection status
   - MQTT connection status
   - Sensor readings every 30 seconds

## Expected Serial Output

```
=================================
ESP32-S3 BMS Node with SHT10
=================================

Connecting to WiFi......
WiFi connected!
IP address: 192.168.1.150
Signal strength (RSSI): -45 dBm

Connecting to MQTT broker... connected!
Subscribed to: bms/node/esp32_01/command
Status published: online
Setup complete!

Reading SHT10 sensor...
Temperature: 23.45 °C
Humidity: 55.20 %
Dew Point: 14.32 °C
Data published successfully!
```

## MQTT Topics

The node automatically uses these topics:

- **Data**: `bms/node/esp32_01/data` - Sensor readings
- **Status**: `bms/node/esp32_01/status` - Online/offline status
- **Commands**: `bms/node/esp32_01/command` - Receives commands from server

## Data Format

### Sensor Data

Published to `bms/node/esp32_01/data` every 30 seconds:

```json
{
  "node_id": "esp32_01",
  "timestamp": 123456,
  "temperature": 23.45,
  "humidity": 55.20,
  "dewpoint": 14.32,
  "rssi": -45,
  "uptime": 3600
}
```

### Status Messages

Published to `bms/node/esp32_01/status`:

```json
{
  "node_id": "esp32_01",
  "status": "online",
  "timestamp": 123456,
  "ip": "192.168.1.150"
}
```

## Supported Commands

Send commands to `bms/node/esp32_01/command`:

### Read Sensor Immediately
```json
{
  "command": "read"
}
```

### Get Status
```json
{
  "command": "status"
}
```

### Reset Device
```json
{
  "command": "reset"
}
```

## Testing Commands with MQTT Explorer

1. Download and install [MQTT Explorer](http://mqtt-explorer.com/)
2. Connect to your MQTT broker:
   - Host: `your-server-ip`
   - Port: `8883` (TLS) or `1883` (non-TLS)
   - Username: `admin` (or your admin user)
   - Password: Your admin password
3. Navigate to `bms/node/esp32_01/command`
4. Publish a command JSON

## Troubleshooting

### WiFi Connection Failed
- Check SSID and password
- Ensure 2.4GHz WiFi is available (ESP32 doesn't support 5GHz)
- Check signal strength

### MQTT Connection Failed
- Verify MQTT server IP address
- Check MQTT credentials from web panel
- Ensure port 8883 (TLS) or 1883 is accessible
- Check server logs: `docker logs bms-mosquitto`

### Sensor Reading Errors
- Check wiring connections
- Ensure SHT10 is powered with 3.3V (not 5V)
- Try swapping DATA and SCK pins if readings fail
- Verify the SHT1x library is installed

### Certificate Issues (TLS)
- **Connection fails with TLS**: Verify the CA certificate matches your server's certificate
- **Certificate expired**: Regenerate certificates on the server and update the sketch
- **Time synchronization**: ESP32 needs accurate time for certificate validation. The sketch uses `setCACert()` which validates the certificate chain.

**For testing without certificate validation** (not recommended for production):
```cpp
espClient.setInsecure(); // Disables certificate validation
```

**Current setup**: Uses proper CA certificate validation for secure, production-ready TLS.

## Customization

### Change Publish Interval
```cpp
const unsigned long PUBLISH_INTERVAL = 60000; // 60 seconds
```

### Change Sensor Pins
```cpp
#define SHT10_DATA_PIN 18
#define SHT10_SCK_PIN  19
```

### Add More Sensors
You can extend the `publishSensorData()` function to include additional sensors:

```cpp
void publishSensorData() {
  // ... existing SHT10 code ...
  
  // Add more sensors
  float voltage = readBatteryVoltage();
  doc["voltage"] = voltage;
  
  // ... rest of code ...
}
```

## Power Management

For battery-powered applications, consider adding deep sleep:

```cpp
#include <esp_sleep.h>

void loop() {
  publishSensorData();
  
  // Sleep for 5 minutes
  esp_sleep_enable_timer_wakeup(5 * 60 * 1000000); // microseconds
  esp_deep_sleep_start();
}
```

## License

MIT

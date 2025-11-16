# OTA (Over-The-Air) Update Guide

This guide explains how to remotely update ESP32 firmware without physical access to the devices.

## Overview

OTA updates allow you to:
- Update ESP32 firmware remotely via WiFi
- No need to physically connect to the device
- Update multiple nodes from the web interface
- Monitor update progress in real-time

## How It Works

```
Web Interface → Upload .bin file → Server stores firmware
                                         ↓
Web Interface → Trigger update → Server sends MQTT command
                                         ↓
                          ESP32 receives command → Downloads firmware → Installs → Reboots
```

## Initial Setup (One-Time)

### 1. Flash OTA-Capable Firmware

**IMPORTANT:** The first time, you must physically connect the ESP32 to upload OTA-capable firmware.

1. Open Arduino IDE
2. Load the OTA sketch: `examples/esp32_sht10_ota/esp32_sht10_ota.ino`
3. Update configuration:
   ```cpp
   const char* WIFI_SSID = "YOUR_WIFI";
   const char* WIFI_PASSWORD = "YOUR_PASSWORD";
   const char* MQTT_SERVER = "YOUR_SERVER_IP";
   const char* MQTT_USERNAME = "node_1";
   const char* MQTT_PASSWORD = "your_mqtt_password";
   const char* NODE_ID = "node_1";
   ```
4. Upload to ESP32 via USB

After this initial upload, all future updates can be done wirelessly!

### 2. Verify OTA Capability

Check Serial Monitor for:
```
ESP32-S3 BMS Node with OTA
Firmware Version: 1.0.0
```

## Building Firmware for OTA

### Method 1: Arduino IDE (Recommended)

1. **Make your code changes** in the `.ino` file
2. **Update firmware version**:
   ```cpp
   #define FIRMWARE_VERSION "1.1.0"  // Increment version
   ```
3. **Export compiled binary**:
   - Sketch → Export Compiled Binary
   - Or: Sketch → Verify/Compile (Ctrl/Cmd + R)
   - Find the `.bin` file in your sketch folder

4. The `.bin` file will be in:
   ```
   sketch_folder/build/esp32.esp32.esp32s3/sketch_name.ino.bin
   ```

### Method 2: PlatformIO

```ini
[env:esp32s3]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
```

Build with: `pio run`

Binary location: `.pio/build/esp32s3/firmware.bin`

## Performing OTA Updates

### Via Web Interface

1. **Upload Firmware**
   - Login to BMS web interface
   - Go to "Nodes" tab
   - Click "Upload Firmware" button
   - Select your `.bin` file
   - Wait for upload to complete

2. **Trigger Update**
   - Find the node you want to update
   - Click "Update Firmware"
   - Select the firmware version
   - Click "Start Update"

3. **Monitor Progress**
   - Node status changes to "updating"
   - Watch the node's status in Monitor tab
   - Node will reboot automatically after update
   - Status returns to "active" with new version

### Via API

1. **Upload firmware**:
   ```bash
   curl -X POST http://server:3000/api/firmware/upload \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "firmware=@firmware.bin"
   ```

2. **List available firmware**:
   ```bash
   curl http://server:3000/api/firmware/list \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Trigger OTA update**:
   ```bash
   curl -X POST http://server:3000/api/nodes/node_1/ota-update \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "firmwareUrl": "http://server:3000/api/firmware/download/firmware-123.bin"
     }'
   ```

## Monitoring Updates

### Serial Monitor

Connect USB to see detailed progress:
```
Command received: {"command":"ota_update","firmware_url":"..."}
=================================
Starting OTA Update
=================================
Firmware URL: http://...
OTA Update started
Progress: 25%
Progress: 50%
Progress: 75%
Progress: 100%
OTA Update finished!
Update successful! Rebooting...
```

### MQTT Status

Monitor status topic `bms/node/node_1/status`:
```json
{
  "node_id": "node_1",
  "status": "updating",
  "message": "OTA update in progress"
}
```

After reboot:
```json
{
  "node_id": "node_1",
  "status": "online",
  "firmware_version": "1.1.0"
}
```

## Troubleshooting

### Update Fails

**Symptoms:** Node returns to "online" without updating

**Causes:**
1. Firmware URL not accessible from ESP32
2. Insufficient memory on ESP32
3. Corrupted `.bin` file
4. Wrong board type in compilation

**Solutions:**
- Verify server IP is accessible from ESP32
- Use correct board settings in Arduino IDE
- Ensure `.bin` file is not corrupted
- Check Serial Monitor for error messages

### Node Becomes Unresponsive

**Recovery:**
1. Physically connect ESP32 via USB
2. Upload working firmware via Arduino IDE
3. Check Serial Monitor for errors

### Firmware Too Large

**Error:** "Not enough space"

**Solutions:**
- Enable partition scheme with more OTA space:
  - Tools → Partition Scheme → "Minimal SPIFFS (1.9MB APP with OTA)"
- Reduce firmware size:
  - Remove unused libraries
  - Optimize code
  - Disable debug output

## Best Practices

### 1. Version Management
- Always increment version number
- Use semantic versioning (major.minor.patch)
- Test new firmware before wide deployment

### 2. Staged Rollouts
- Update one test node first
- Verify it works correctly
- Then update remaining nodes

### 3. Rollback Plan
- Keep previous firmware versions available
- Can rollback by sending older `.bin` file

### 4. Testing
- Test OTA updates on development devices first
- Verify sensor functionality after update
- Check MQTT connectivity

### 5. Safety
- Don't update all nodes simultaneously
- Keep a physical backup device
- Document firmware changes

## Example: Complete Update Workflow

1. **Develop new feature**
   ```cpp
   // Added temperature alerts
   #define FIRMWARE_VERSION "1.1.0"
   if (temperature > 30.0) {
     publishAlert("Temperature high!");
   }
   ```

2. **Build and test locally**
   - Upload via USB to test device
   - Verify functionality
   - Monitor for 24 hours

3. **Export firmware binary**
   - Sketch → Export Compiled Binary
   - Locate `.bin` file

4. **Upload to server**
   - Login to web interface
   - Upload firmware-1.1.0.bin

5. **Update test node**
   - Select node "test_room"
   - Trigger OTA update
   - Verify success

6. **Roll out to production**
   - Update remaining nodes one by one
   - Monitor each update

7. **Verify deployment**
   - Check all nodes show version 1.1.0
   - Verify sensor data still flowing
   - Test new features

## Security Considerations

- Firmware downloads use HTTP (not encrypted)
- For production: use HTTPS for firmware delivery
- Restrict firmware upload to authenticated users only
- Consider signing firmware binaries

## API Reference

### POST `/api/firmware/upload`
Upload new firmware file

**Request:** `multipart/form-data` with file field `firmware`

**Response:**
```json
{
  "message": "Firmware uploaded successfully",
  "firmware": {
    "filename": "firmware-1637012345.bin",
    "size": 954321,
    "path": "/api/firmware/download/firmware-1637012345.bin"
  }
}
```

### GET `/api/firmware/list`
List all available firmware files

**Response:**
```json
{
  "firmware": [
    {
      "filename": "firmware-1637012345.bin",
      "size": 954321,
      "uploadedAt": "2025-11-15T12:00:00.000Z",
      "path": "/api/firmware/download/firmware-1637012345.bin"
    }
  ]
}
```

### GET `/api/firmware/download/:filename`
Download firmware file (used by ESP32)

**Response:** Binary firmware file

### POST `/api/nodes/:nodeId/ota-update`
Trigger OTA update on a node

**Request:**
```json
{
  "firmwareUrl": "http://server:3000/api/firmware/download/firmware-123.bin"
}
```

**Response:**
```json
{
  "message": "OTA update command sent",
  "nodeId": "node_1",
  "firmwareUrl": "http://..."
}
```

### DELETE `/api/firmware/:filename`
Delete firmware file from server

**Response:**
```json
{
  "message": "Firmware deleted successfully"
}
```

## Limitations

- ESP32 must be online and connected to WiFi
- Update takes 30-60 seconds
- Node is unavailable during update
- Requires sufficient flash memory (typically 2-4MB free)
- First firmware must be uploaded via USB

## Support

For issues:
1. Check Serial Monitor output
2. Verify network connectivity
3. Check server logs: `docker logs bms-api`
4. Test with simple firmware first

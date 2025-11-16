# OTA Update Quick Start

Get your ESP32 nodes updated remotely in 5 minutes!

## Prerequisites

- BMS server running (see `DEPLOYMENT.md`)
- ESP32 with OTA firmware already flashed (first time requires USB)
- Arduino IDE or PlatformIO

## Step 1: Flash Initial OTA Firmware (One-Time Setup)

### Using Arduino IDE

1. **Open the sketch**:
   ```
   examples/esp32_sht10_ota/esp32_sht10_ota.ino
   ```

2. **Configure WiFi and MQTT**:
   ```cpp
   const char* WIFI_SSID = "YourWiFi";
   const char* WIFI_PASSWORD = "YourPassword";
   const char* MQTT_SERVER = "192.168.1.172";  // Your server IP
   const char* MQTT_USERNAME = "node_1";
   const char* MQTT_PASSWORD = "your_mqtt_password";
   const char* NODE_ID = "node_1";
   ```

3. **Select board**: ESP32S3 Dev Module (or your board)

4. **Upload via USB** (this is the last time you need USB!)

5. **Verify**: Check Serial Monitor for:
   ```
   ESP32-S3 BMS Node with OTA
   Firmware Version: 1.0.0
   WiFi connected!
   ```

## Step 2: Make Changes & Build Firmware

1. **Edit your code** (add features, fix bugs, etc.)

2. **Update version**:
   ```cpp
   #define FIRMWARE_VERSION "1.1.0"  // Increment this!
   ```

3. **Export binary**:
   - Sketch → Export Compiled Binary (Ctrl/Cmd + Alt + S)
   - Or just Verify/Compile (Ctrl/Cmd + R)

4. **Locate the .bin file**:
   ```
   sketch_folder/build/esp32.esp32.esp32s3/esp32_sht10_ota.ino.bin
   ```

## Step 3: Upload to BMS Server

### Via Web Interface (Easiest)

1. Open browser: `http://your-server-ip:8080`
2. Login with admin/admin
3. Click **Firmware** tab
4. Click **+ Upload Firmware**
5. Select your `.bin` file
6. Click **Upload**
7. Wait for upload to complete

### Via API (Advanced)

```bash
curl -X POST http://your-server:3000/api/firmware/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "firmware=@path/to/firmware.bin"
```

## Step 4: Trigger OTA Update

### Method A: From Firmware Tab

1. In **Firmware** tab, find your uploaded firmware
2. Click **Update Node**
3. Select the node from dropdown
4. Click **Start Update**

### Method B: From Nodes Tab

1. In **Nodes** tab, find your node
2. Click **OTA** button
3. Select firmware from dropdown
4. Click **Start Update**

## Step 5: Monitor Update Progress

### In Web Interface

1. Switch to **Monitor** tab
2. Watch node status change to "updating"
3. Wait ~30-60 seconds
4. Status returns to "active" ✅

### Via Serial Monitor (Optional)

Connect USB and watch:
```
Command received: {"command":"ota_update",...}
Starting OTA Update
Progress: 25%
Progress: 50%
Progress: 75%
Progress: 100%
Update successful! Rebooting...
```

### Via MQTT (Advanced)

Subscribe to status topic:
```bash
mosquitto_sub -h your-server -p 8883 \
  --cafile ca.crt \
  -u server -P server_password_123 \
  -t "bms/node/+/status"
```

## Troubleshooting

### Update Doesn't Start

**Check**:
- Node is online (status = active)
- Firmware URL is accessible from ESP32
- MQTT connection is working

**Fix**: Check logs:
```bash
docker logs bms-api
```

### Update Fails Halfway

**Causes**:
- WiFi connection dropped
- Insufficient flash memory
- Corrupted firmware file

**Fix**: Try again, or flash via USB

### Node Won't Boot After Update

**Recovery**:
1. Connect ESP32 via USB
2. Upload working firmware
3. Check Serial Monitor for errors

### "Not enough space" Error

**Fix**: Change partition scheme in Arduino IDE:
- Tools → Partition Scheme → "Minimal SPIFFS (1.9MB APP with OTA)"

## Tips for Success

✅ **Always test on one node first**

✅ **Keep old firmware files for rollback**

✅ **Increment version numbers**

✅ **Don't update all nodes simultaneously**

✅ **Test locally before OTA update**

❌ Don't disconnect power during update

❌ Don't update critical nodes during business hours

❌ Don't skip version testing

## Example Workflow

```bash
# 1. Make changes
vim esp32_sht10_ota.ino
# Change FIRMWARE_VERSION to "1.1.0"

# 2. Build
arduino-cli compile --fqbn esp32:esp32:esp32s3 .

# 3. Find binary
ls build/esp32.esp32.esp32s3/*.bin

# 4. Upload (via web UI)
# - Login to http://server:8080
# - Firmware tab → Upload → Select file

# 5. Update node
# - Click "Update Node" on firmware
# - Select node_1
# - Start Update

# 6. Verify
# - Monitor tab shows "updating" → "active"
# - Serial shows "Firmware Version: 1.1.0"
```

## Next Steps

- Read full guide: `OTA_GUIDE.md`
- Setup automation for bulk updates
- Implement firmware signing (for production)
- Configure HTTPS for firmware downloads

## Need Help?

1. Check logs: `docker logs bms-api`
2. Check ESP32 serial output
3. Review `OTA_GUIDE.md` troubleshooting section
4. Test with simple firmware first

---

**First OTA update?** It might feel magical watching your ESP32 update wirelessly! 🎉

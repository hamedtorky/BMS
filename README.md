# BMS Server - Building Management System

A complete IoT Building Management System with **remote OTA firmware updates**, real-time monitoring, and secure MQTT communication. Monitor temperature, humidity, and environmental sensors using ESP32 nodes - update them wirelessly without physical access!

![Architecture](https://img.shields.io/badge/ESP32-MQTT-blue) ![Docker](https://img.shields.io/badge/Docker-Compose-blue) ![Node.js](https://img.shields.io/badge/Node.js-API-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue) ![OTA](https://img.shields.io/badge/OTA-Updates-orange)

## Features

### 🌡️ Sensor Monitoring
- Real-time temperature, humidity, and dew point readings
- Support for multiple ESP32 sensor nodes
- WiFi signal strength monitoring
- Auto-refresh monitoring dashboard

### 🔒 Secure Communication
- TLS-encrypted MQTT connections (port 8883)
- Certificate-based authentication
- Access control lists (ACL)
- User authentication for web interface

### 📊 Web Dashboard
- Node management interface
- Live sensor monitoring with auto-refresh
- Real-time charts (temperature & humidity history)
- Historical data viewing
- Responsive design

### 🔌 API Integration
- RESTful API for node management
- **Public API** for sensor data (no auth required)
- WebSocket support for real-time updates
- JSON-based data exchange

### 🔄 OTA Firmware Updates ⭐
- **Remote firmware updates** for ESP32 nodes
- Upload .bin files via web interface
- One-click OTA trigger for any node
- Real-time update progress monitoring
- Firmware version tracking
- No physical access needed after initial setup
- Update multiple nodes sequentially

### 🚀 Easy Deployment
- One-command setup script
- Docker Compose orchestration
- Auto-generated ESP32 Arduino code
- Automatic TLS certificate generation

## Quick Start

### Prerequisites
- Docker Desktop installed
- 2GB RAM minimum
- Network access for ESP32 nodes

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url> BMS-server
   cd BMS-server
   ```

2. **Run setup script**
   ```bash
   ./setup.sh
   ```

3. **Access the system**
   - Web Interface: `http://<SERVER_IP>:8080`
   - Login with credentials you created during setup

4. **Add sensor nodes**
   - Click "Add Node" in the web interface
   - Get auto-generated ESP32 code with TLS certificate
   - Flash to your ESP32 device (first time only via USB)

5. **Update firmware remotely** (Optional)
   - Go to Firmware tab
   - Upload new .bin file
   - Click OTA button on any node
   - Watch it update wirelessly! 🚀

That's it! 🎉

## System Architecture

```
┌─────────────┐
│ ESP32 Nodes │ ← OTA Updates (WiFi)
└──────┬──────┘
       │ MQTT/TLS (8883)
       ↓
┌──────────────────┐
│ Mosquitto Broker │
└────────┬─────────┘
         │
         ↓
┌─────────────────┐     ┌────────────┐
│   Node.js API   │────→│ PostgreSQL │
│  (Port 3000)    │     │ Database   │
└────────┬────────┘     └────────────┘
         │
         ↓
┌─────────────────┐
│  Web Dashboard  │
│  (Port 8080)    │
└─────────────────┘
```

### Components
- **MQTT Broker:** Eclipse Mosquitto with TLS
- **Database:** PostgreSQL 15
- **API Server:** Node.js with Express
- **Web Frontend:** Vanilla JS + HTML/CSS
- **Sensor Nodes:** ESP32 with Arduino

## API Endpoints

### Public API (No Authentication)
```bash
# Get all active sensors
curl http://<SERVER_IP>:3000/api/public/sensors

# Get specific sensor data
curl http://<SERVER_IP>:3000/api/public/sensors/node_1
```

### Authenticated API
- `GET /api/nodes` - List all nodes
- `POST /api/nodes` - Create new node
- `GET /api/nodes/:id/data` - Get sensor data
- `POST /api/firmware/upload` - Upload firmware
- `POST /api/nodes/:id/ota-update` - Trigger OTA update
- More in [DEPLOYMENT.md](DEPLOYMENT.md)

## Documentation

- **[QUICKSTART_OTA.md](QUICKSTART_OTA.md)** - 5-minute OTA update guide
  - Quick setup for remote firmware updates
  - Step-by-step instructions
  - Troubleshooting tips

- **[OTA_GUIDE.md](OTA_GUIDE.md)** - Complete OTA documentation
  - Detailed OTA setup & workflows
  - Building firmware binaries
  - Best practices & security
  - API reference

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
  - Manual setup instructions
  - Troubleshooting
  - Docker commands
  - Security notes
  - Backup procedures

- **[examples/](examples/)** - ESP32 example sketches
  - OTA version (with remote update support)
  - TLS version
  - Simple version (no TLS)
  - SHT10 sensor integration

## Hardware Requirements

### Server
- Any computer with Docker support
- 2GB RAM minimum
- Network connectivity

### ESP32 Nodes
- ESP32-S3 or compatible
- SHT10/SHT11 temperature & humidity sensor
- WiFi connectivity

### Wiring Example (SHT10)
```
SHT10 DATA → ESP32 GPIO 10
SHT10 SCK  → ESP32 GPIO 11
SHT10 VCC  → 3.3V
SHT10 GND  → GND
```

## Development

### Project Structure
```
BMS-server/
├── api/                      # Node.js API server
│   ├── server.js            # Main API with OTA endpoints
│   └── package.json
├── web/                      # Web frontend
│   ├── index.html           # Dashboard with Firmware tab
│   ├── app.js               # Frontend logic
│   └── styles.css
├── mosquitto/                # MQTT broker config
│   ├── config/              # Configuration files
│   ├── certs/               # TLS certificates
│   └── data/                # Persistent data
├── firmware/                 # Uploaded firmware storage
├── examples/
│   ├── esp32_sht10/         # Standard TLS sketch
│   └── esp32_sht10_ota/     # OTA-capable sketch ⭐
├── docker-compose.yml
├── setup.sh                  # Automated setup
├── DEPLOYMENT.md             # Deployment guide
├── OTA_GUIDE.md              # Complete OTA documentation
└── QUICKSTART_OTA.md         # 5-minute OTA guide
```

### Building from Source
```bash
# Build all containers
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Contributing

Contributions welcome! Please feel free to submit pull requests or open issues.

## License

See LICENSE file for details.

## Features Overview

| Feature | Status | Description |
|---------|--------|-------------|
| 🌡️ Sensor Monitoring | ✅ | Real-time temperature, humidity, dew point |
| 📊 Web Dashboard | ✅ | 3 tabs: Nodes, Monitor, Firmware |
| 📈 Live Charts | ✅ | Temperature & humidity history graphs |
| 🔒 TLS Encryption | ✅ | Secure MQTT on port 8883 |
| 🔄 OTA Updates | ✅ | Remote firmware updates via web UI |
| 🌐 Public API | ✅ | No-auth sensor data endpoint |
| 🔐 Authentication | ✅ | JWT-based user authentication |
| 🐳 Docker Deploy | ✅ | One-command setup script |
| 📱 Auto-Generated Code | ✅ | ESP32 sketch with credentials |
| 💾 Data Persistence | ✅ | PostgreSQL with historical data |

## OTA Update Quick Example

```bash
# 1. Build your firmware in Arduino IDE
# 2. Upload via web interface (Firmware tab)
# 3. Click OTA button on node
# 4. Done! Node updates and reboots automatically
```

**No more climbing ladders to update sensors!** 🪜❌

## Tested Hardware

- ✅ ESP32-S3 DevKit
- ✅ SHT10/SHT11 sensors
- ✅ Docker on macOS/Linux/Windows
- ✅ OTA updates over WiFi

## Support

- Check [DEPLOYMENT.md](DEPLOYMENT.md) for troubleshooting
- Review [OTA_GUIDE.md](OTA_GUIDE.md) for OTA issues
- Docker logs: `docker-compose logs`
- ESP32 Serial Monitor: 115200 baud

## Troubleshooting Common Issues

**OTA not working?**
- Ensure ESP32 is running OTA-capable firmware
- Check Serial Monitor for "ESP32-S3 BMS Node with OTA"
- Verify node is subscribed to command topic

**Can't upload firmware?**
- Hard refresh browser (Ctrl+Shift+R)
- Check file is .bin format
- Max file size: 10MB

**Node not connecting?**
- Verify MQTT credentials
- Check TLS certificate is loaded
- Ensure WiFi is connected

---

**Made with ❤️ for IoT and Building Automation**

**Repository:** https://github.com/hamedtorky/BMS

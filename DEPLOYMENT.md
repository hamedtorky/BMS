# BMS Server Deployment Guide

Complete guide for deploying the BMS (Building Management System) server on any computer with Docker.

## Prerequisites

- **Docker Desktop** installed
  - Windows/Mac: https://www.docker.com/products/docker-desktop
  - Linux: `sudo apt-get install docker.io docker-compose`
- **Git** (optional, for cloning)
- **Minimum 2GB RAM** available
- **Network access** for ESP32 nodes

## Quick Start (Automated Setup)

### 1. Clone or Download the Repository

```bash
git clone <your-repo-url> BMS-server
cd BMS-server
```

Or download and extract the ZIP file.

### 2. Run the Setup Script

**macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows (Git Bash or WSL):**
```bash
bash setup.sh
```

The script will:
- ✓ Check Docker installation
- ✓ Detect your server IP address
- ✓ Create directory structure
- ✓ Generate TLS certificates
- ✓ Set up MQTT authentication
- ✓ Build and start all services
- ✓ Create admin user for web interface

### 3. Access the System

After setup completes, you can access:

- **Web Interface:** `http://<SERVER_IP>:8080`
- **Public API:** `http://<SERVER_IP>:3000/api/public/sensors`
- **MQTT Broker:** `<SERVER_IP>:1883` (non-TLS) or `:8883` (TLS)

## Manual Setup

If you prefer to set up manually or the script doesn't work:

### 1. Create Required Directories

```bash
mkdir -p mosquitto/{config,data,log,certs}
chmod -R 777 mosquitto/
```

### 2. Generate TLS Certificates

```bash
cd mosquitto/certs

# Generate CA
openssl genrsa -out ca.key 2048
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
    -subj "/C=US/ST=State/L=City/O=BMS/CN=BMS CA"

# Generate Server Certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
    -subj "/C=US/ST=State/L=City/O=BMS/CN=YOUR_SERVER_IP"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt -days 3650
rm server.csr

cd ../..
```

### 3. Create MQTT Password File

```bash
docker run --rm -v "$(pwd)/mosquitto/config:/mosquitto/config" \
    eclipse-mosquitto:latest \
    mosquitto_passwd -c -b /mosquitto/config/passwd server server_password_123

chmod 666 mosquitto/config/passwd
```

### 4. Build and Start Services

```bash
docker-compose build
docker-compose up -d
```

### 5. Create Admin User

Wait ~10 seconds for services to start, then:

```bash
docker exec bms-api node -e "
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'bms_db',
  user: 'bms_user',
  password: 'bms_password_change_me',
});

(async () => {
  const hash = await bcrypt.hash('YOUR_PASSWORD', 10);
  await pool.query(
    'INSERT INTO users (username, password_hash, role) VALUES (\$1, \$2, \$3)',
    ['admin', hash, 'admin']
  );
  console.log('Admin created');
  process.exit(0);
})();
"
```

## Adding ESP32 Nodes

1. **Login to Web Interface** at `http://<SERVER_IP>:8080`

2. **Click "Add Node"**
   - Enter Node ID (e.g., `sensor_1`)
   - Enter Name (e.g., `Living Room`)
   - Enter Address/Location
   - Click Save

3. **Get ESP32 Code**
   - After creating the node, MQTT credentials will be displayed
   - Click **"Show ESP32 Code"**
   - Click **"Copy to Clipboard"**

4. **Flash ESP32**
   - Open Arduino IDE
   - Paste the copied code
   - Update WiFi credentials:
     ```cpp
     const char* WIFI_SSID = "YOUR_WIFI_SSID";
     const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
     ```
   - Update sensor pin numbers if different:
     ```cpp
     #define SHT10_DATA_PIN 10
     #define SHT10_SCK_PIN  11
     ```
   - Upload to ESP32

5. **Verify**
   - Check Serial Monitor (115200 baud) for connection status
   - Node should appear as "active" in the Monitor tab

## API Endpoints

### Authenticated Endpoints (Require Login)

- `GET /api/nodes` - List all nodes
- `GET /api/nodes/:nodeId` - Get node details
- `POST /api/nodes` - Create new node
- `PUT /api/nodes/:nodeId` - Update node
- `DELETE /api/nodes/:nodeId` - Delete node
- `GET /api/nodes/:nodeId/data` - Get node data history
- `POST /api/nodes/:nodeId/command` - Send command to node

### Public Endpoints (No Authentication)

- `GET /api/public/sensors` - Get all active sensors with latest data
- `GET /api/public/sensors/:nodeId` - Get specific sensor data
  - Optional: `?limit=10` for data history

Example:
```bash
curl http://192.168.1.172:3000/api/public/sensors
```

## Docker Commands

### View Logs
```bash
docker-compose logs -f              # All services
docker-compose logs -f api          # API only
docker-compose logs -f mosquitto    # MQTT broker only
```

### Restart Services
```bash
docker-compose restart              # All services
docker-compose restart api          # API only
```

### Stop Services
```bash
docker-compose down                 # Stop and remove containers
docker-compose down -v              # Also remove volumes (database data)
```

### Start Services
```bash
docker-compose up -d                # Start in background
```

### Rebuild Services
```bash
docker-compose build                # Rebuild all
docker-compose build api            # Rebuild API only
docker-compose up -d --build        # Rebuild and start
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker ps

# Check logs for errors
docker-compose logs

# Restart everything
docker-compose down
docker-compose up -d
```

### Can't Access Web Interface

1. Check your firewall allows port 8080
2. Verify services are running: `docker-compose ps`
3. Check the correct IP address: `ifconfig` or `ipconfig`

### ESP32 Won't Connect

1. Verify WiFi credentials in Arduino code
2. Check MQTT server IP is correct
3. Ensure MQTT broker is running: `docker logs bms-mosquitto`
4. Check Serial Monitor for error codes:
   - `rc=-2`: Connection refused (wrong credentials or TLS issue)
   - `rc=-4`: Connection timeout (wrong IP or firewall)
   - `rc=5`: Not authorized (ACL issue)

### MQTT Password Issues

Reset MQTT passwords:
```bash
docker run --rm -v "$(pwd)/mosquitto/config:/mosquitto/config" \
    eclipse-mosquitto:latest \
    mosquitto_passwd -c -b /mosquitto/config/passwd server server_password_123

docker-compose restart mosquitto
```

### Database Issues

Reset database (WARNING: deletes all data):
```bash
docker-compose down -v
docker-compose up -d
# Re-create admin user (see Manual Setup step 5)
```

## System Architecture

```
┌─────────────┐      MQTT/TLS       ┌──────────────┐
│  ESP32 Node │ ─────────────────► │   Mosquitto  │
│  (Sensors)  │      Port 8883      │ MQTT Broker  │
└─────────────┘                     └──────┬───────┘
                                           │
       ┌───────────────────────────────────┘
       │
       ▼
┌──────────────┐    PostgreSQL    ┌──────────────┐
│   Node.js    │ ◄────────────────┤  PostgreSQL  │
│   API Server │                   │   Database   │
└──────┬───────┘                   └──────────────┘
       │
       │ HTTP
       │
       ▼
┌──────────────┐
│   Nginx      │
│ Web Frontend │
└──────────────┘
```

## Security Notes

- **Change default passwords** in production
- **Use TLS** for MQTT connections (port 8883)
- **Firewall** rules to restrict access
- **HTTPS** for web interface (add reverse proxy like Nginx)
- **Regular backups** of PostgreSQL database

## Backup and Restore

### Backup
```bash
# Backup database
docker exec bms-postgres pg_dump -U bms_user bms_db > backup.sql

# Backup certificates
tar -czf certs-backup.tar.gz mosquitto/certs/
```

### Restore
```bash
# Restore database
cat backup.sql | docker exec -i bms-postgres psql -U bms_user -d bms_db

# Restore certificates
tar -xzf certs-backup.tar.gz
```

## Support

For issues, check:
1. Docker logs: `docker-compose logs`
2. ESP32 Serial Monitor output
3. Browser console for web interface errors

## License

See LICENSE file for details.

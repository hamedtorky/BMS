# BMS Server - MQTT Management System

A complete Docker-based solution for managing BMS (Battery Management System) nodes with secure MQTT messaging and a web-based management panel.

## Features

- **Secure MQTT Broker** (Mosquitto) with TLS/SSL support
- **RESTful API** (Node.js/Express) for node management
- **PostgreSQL Database** for persistent storage
- **Web Management Panel** for easy node administration
- **Docker Compose** for easy deployment
- **Authentication & Authorization** with JWT tokens
- **Real-time MQTT messaging** between server and nodes

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Web Panel  │────▶│  API Server  │────▶│  PostgreSQL │
│  (Nginx)    │     │  (Node.js)   │     │  Database   │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Mosquitto  │
                    │ MQTT Broker  │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    ▼              ▼
              ┌──────────┐   ┌──────────┐
              │  Node 1  │   │  Node N  │
              └──────────┘   └──────────┘
```

## Prerequisites

- Docker & Docker Compose
- OpenSSL (for certificate generation)

## Quick Start

### 1. Setup

Run the setup script to create directories and generate SSL certificates:

```bash
chmod +x setup.sh
./setup.sh
```

### 2. Configure Security (IMPORTANT!)

Edit `docker-compose.yml` and change these values:

- `POSTGRES_PASSWORD`
- `DB_PASSWORD`
- `JWT_SECRET`

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Configure MQTT Users

Create MQTT users for the server and admin:

```bash
# Create admin user
docker exec -it bms-mosquitto mosquitto_passwd -b /mosquitto/config/passwd admin your_admin_password

# Create server user
docker exec -it bms-mosquitto mosquitto_passwd -b /mosquitto/config/passwd server your_server_password

# Restart mosquitto to apply changes
docker-compose restart mosquitto
```

Update the server password in `docker-compose.yml` under the `api` service environment variables.

### 5. Access the Web Panel

Open your browser and navigate to:
```
http://localhost:8080
```

Default credentials:
- Username: `admin`
- Password: `admin123` (CHANGE THIS!)

## Usage

### Adding a Node

1. Log in to the web panel
2. Click "Add Node"
3. Fill in the node details:
   - **Node ID**: Unique identifier for the node
   - **Name**: Human-readable name
   - **Address**: Node's network address or location
   - **Description**: Optional description
4. Save the node and **copy the MQTT credentials** (they won't be shown again!)

### Node Configuration

Configure your BMS nodes with the following MQTT settings:

- **Host**: `your-server-ip`
- **Port**: `8883` (TLS) or `1883` (unencrypted)
- **Username**: `node_<node_id>` (provided when creating node)
- **Password**: (provided when creating node)
- **Use TLS**: Yes (recommended)

### MQTT Topics

Nodes should use these topic patterns:

- **Publishing data**: `bms/node/<node_id>/data`
- **Publishing status**: `bms/node/<node_id>/status`
- **Receiving commands**: `bms/node/<node_id>/command`

### Example Node Code (Arduino/ESP32)

```cpp
#include <PubSubClient.h>
#include <WiFiClientSecure.h>

const char* mqtt_server = "your-server-ip";
const int mqtt_port = 8883;
const char* mqtt_user = "node_<your_node_id>";
const char* mqtt_password = "your_password";

WiFiClientSecure espClient;
PubSubClient client(espClient);

void setup() {
  espClient.setInsecure(); // For self-signed certs
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Publish data
  String topic = "bms/node/<your_node_id>/data";
  String payload = "{\"voltage\":12.5,\"current\":2.3,\"temperature\":25.0}";
  client.publish(topic.c_str(), payload.c_str());
  
  delay(5000);
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Handle incoming commands
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32Client", mqtt_user, mqtt_password)) {
      String commandTopic = "bms/node/<your_node_id>/command";
      client.subscribe(commandTopic.c_str());
    } else {
      delay(5000);
    }
  }
}
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token

### Nodes
- `GET /api/nodes` - Get all nodes
- `GET /api/nodes/:nodeId` - Get specific node
- `POST /api/nodes` - Create new node
- `PUT /api/nodes/:nodeId` - Update node
- `DELETE /api/nodes/:nodeId` - Delete node
- `GET /api/nodes/:nodeId/data` - Get node data history
- `POST /api/nodes/:nodeId/command` - Send command to node

### Health
- `GET /health` - Check API and MQTT status

## Security Considerations

1. **Change default passwords** immediately after setup
2. **Use strong passwords** for MQTT and database
3. **Update JWT secret** in production
4. **Enable certificate validation** for production (set `rejectUnauthorized: true`)
5. **Use proper CA-signed certificates** instead of self-signed
6. **Enable firewall rules** to restrict access
7. **Use HTTPS** for the web panel in production
8. **Regularly update** Docker images

## Ports

- `1883` - MQTT (unencrypted)
- `8883` - MQTT (TLS)
- `9001` - MQTT WebSockets
- `3000` - API Server
- `5432` - PostgreSQL
- `8080` - Web Panel

## Troubleshooting

### MQTT Connection Failed
- Check if mosquitto is running: `docker ps`
- View logs: `docker logs bms-mosquitto`
- Verify credentials: Check password file creation

### Can't Login to Web Panel
- Check API logs: `docker logs bms-api`
- Verify database connection
- Check if default user was created

### Node Can't Connect
- Verify MQTT credentials
- Check if node user was created in MQTT
- Test connection with MQTT client (e.g., MQTT Explorer)
- Check certificate settings

## Development

To run in development mode:

```bash
# API with auto-reload
cd api
npm install
npm run dev

# View logs
docker-compose logs -f
```

## Backup

Backup the PostgreSQL database:

```bash
docker exec bms-postgres pg_dump -U bms_user bms_db > backup.sql
```

Restore:

```bash
cat backup.sql | docker exec -i bms-postgres psql -U bms_user bms_db
```

## License

MIT

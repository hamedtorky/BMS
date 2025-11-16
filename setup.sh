#!/bin/bash

# BMS Server Setup Script
# This script sets up the BMS server on a fresh system with Docker installed

set -e  # Exit on error

echo "================================="
echo "BMS Server Setup"
echo "================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed!"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not installed!"
    exit 1
fi

echo "✓ Docker is installed"
echo ""

# Get the server IP
echo "Detecting server IP address..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    SERVER_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    SERVER_IP=$(hostname -I | awk '{print $1}')
else
    echo "Warning: Could not auto-detect IP. Please enter manually."
    read -p "Enter your server IP address: " SERVER_IP
fi

echo "Server IP: $SERVER_IP"
echo ""

# Create directories if they don't exist
echo "Creating directory structure..."
mkdir -p mosquitto/config
mkdir -p mosquitto/data
mkdir -p mosquitto/log
mkdir -p mosquitto/certs

# Set permissions
chmod -R 777 mosquitto/
echo "✓ Directories created"
echo ""

# Generate TLS certificates if they don't exist
if [ ! -f mosquitto/certs/ca.crt ]; then
    echo "Generating TLS certificates..."
    
    # Generate CA private key
    openssl genrsa -out mosquitto/certs/ca.key 2048
    
    # Generate CA certificate
    openssl req -new -x509 -days 3650 -key mosquitto/certs/ca.key -out mosquitto/certs/ca.crt \
        -subj "/C=US/ST=State/L=City/O=BMS/CN=BMS CA"
    
    # Generate server private key
    openssl genrsa -out mosquitto/certs/server.key 2048
    
    # Generate server certificate signing request
    openssl req -new -key mosquitto/certs/server.key -out mosquitto/certs/server.csr \
        -subj "/C=US/ST=State/L=City/O=BMS/CN=$SERVER_IP"
    
    # Sign server certificate with CA
    openssl x509 -req -in mosquitto/certs/server.csr -CA mosquitto/certs/ca.crt \
        -CAkey mosquitto/certs/ca.key -CAcreateserial -out mosquitto/certs/server.crt -days 3650
    
    # Clean up CSR
    rm mosquitto/certs/server.csr
    
    echo "✓ TLS certificates generated"
else
    echo "✓ TLS certificates already exist"
fi
echo ""

# Create Mosquitto password file with server user
echo "Setting up MQTT users..."
docker run --rm -v "$(pwd)/mosquitto/config:/mosquitto/config" eclipse-mosquitto:latest \
    sh -c "mosquitto_passwd -c -b /mosquitto/config/passwd server server_password_123" 2>/dev/null || true

chmod 666 mosquitto/config/passwd
echo "✓ MQTT server user created (username: server, password: server_password_123)"
echo ""

# Create admin user
echo "Setting up web interface admin..."
echo "Please enter admin credentials:"
read -p "Admin username [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -sp "Admin password: " ADMIN_PASS
echo ""

echo ""
echo "Building and starting services..."
docker-compose build
docker-compose up -d

echo "Waiting for services to start..."
sleep 10

# Create admin user in database using bcrypt
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
  try {
    const hash = await bcrypt.hash('$ADMIN_PASS', 10);
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (\$1, \$2, \$3) ON CONFLICT (username) DO UPDATE SET password_hash = \$2',
      ['$ADMIN_USER', hash, 'admin']
    );
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
"

echo ""
echo "================================="
echo "Setup Complete!"
echo "================================="
echo ""
echo "Your BMS server is now running!"
echo ""
echo "Web Interface: http://$SERVER_IP:8080"
echo "  Username: $ADMIN_USER"
echo "  Password: (the one you entered)"
echo ""
echo "MQTT Broker:"
echo "  Host: $SERVER_IP"
echo "  Port: 1883 (non-TLS) or 8883 (TLS)"
echo ""
echo "Public API:"
echo "  http://$SERVER_IP:3000/api/public/sensors"
echo ""
echo "To add nodes:"
echo "  1. Login to the web interface"
echo "  2. Click 'Add Node'"
echo "  3. Click 'Show ESP32 Code' to get the Arduino sketch"
echo ""
echo "To stop: docker-compose down"
echo "To restart: docker-compose up -d"
echo "To view logs: docker-compose logs -f"
echo ""
echo "Testing:"
echo "  Run OTA unit tests: cd examples/esp32_sht10_ota && pio test -e native"
echo "  (Requires PlatformIO: pip install platformio)"
echo ""

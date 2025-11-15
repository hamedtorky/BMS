#!/bin/bash

echo "=== BMS Server Setup ==="
echo ""

# Create necessary directories
echo "Creating directory structure..."
mkdir -p mosquitto/certs
mkdir -p mosquitto/config
mkdir -p mosquitto/data
mkdir -p mosquitto/log

# Generate self-signed certificates for MQTT
echo ""
echo "Generating SSL certificates for MQTT..."
cd mosquitto/certs

# Generate CA key and certificate
openssl genrsa -out ca.key 2048
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt -subj "/C=US/ST=State/L=City/O=BMS/CN=BMS CA"

# Generate server key and certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/C=US/ST=State/L=City/O=BMS/CN=localhost"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 3650

# Clean up CSR
rm server.csr

echo "Certificates generated successfully!"
cd ../..

# Create MQTT password file
echo ""
echo "Setting up MQTT passwords..."
echo "Default passwords will be created. You should change these in production!"

# Create a temporary password file
touch mosquitto/config/passwd

# Note: The password file needs to be created inside the container
# We'll add this to docker-compose as a command

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Review and update passwords in docker-compose.yml (DB_PASSWORD, JWT_SECRET)"
echo "2. Run: docker-compose up -d"
echo "3. Create MQTT users by running:"
echo "   docker exec -it bms-mosquitto mosquitto_passwd -b /mosquitto/config/passwd admin admin_password"
echo "   docker exec -it bms-mosquitto mosquitto_passwd -b /mosquitto/config/passwd server server_password"
echo "4. Restart mosquitto: docker-compose restart mosquitto"
echo "5. Access the web panel at: http://localhost:8080"
echo "6. Default login: admin / admin123 (CHANGE THIS!)"
echo ""

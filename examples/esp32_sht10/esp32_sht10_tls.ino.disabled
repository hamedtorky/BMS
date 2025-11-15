/*
 * ESP32-S3 BMS Node with SHT10 Temperature & Humidity Sensor
 * 
 * This sketch connects an ESP32-S3 to the BMS MQTT server and sends
 * temperature and humidity data from an SHT10 sensor.
 * 
 * Hardware:
 * - ESP32-S3 board
 * - SHT10 sensor
 * 
 * Connections:
 * - SHT10 DATA -> GPIO 10
 * - SHT10 SCK  -> GPIO 11
 * - SHT10 VCC  -> 3.3V
 * - SHT10 GND  -> GND
 * 
 * Required Libraries:
 * - WiFi (built-in)
 * - PubSubClient by Nick O'Leary
 * - ArduinoJson by Benoit Blanchon
 * - SHT1x by Practical Arduino
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <SHT1x-ESP.h>


// ===========================
// TLS CERTIFICATE
// ===========================
// CA Certificate from your BMS server
// Located at: mosquitto/certs/ca.crt
// Stored in PROGMEM (flash) to save RAM
const char ca_cert[] = R"EOF(
-----BEGIN CERTIFICATE-----
MIIDdzCCAl+gAwIBAgIURcr0JY4K1iqSI+sKmcnbdivO/aswDQYJKoZIhvcNAQEL
BQAwSzELMAkGA1UEBhMCVVMxDjAMBgNVBAgMBVN0YXRlMQ0wCwYDVQQHDARDaXR5
MQwwCgYDVQQKDANCTVMxDzANBgNVBAMMBkJNUyBDQTAeFw0yNTExMTUxMTU2NTVa
Fw0zNTExMTMxMTU2NTVaMEsxCzAJBgNVBAYTAlVTMQ4wDAYDVQQIDAVTdGF0ZTEN
MAsGA1UEBwwEQ2l0eTEMMAoGA1UECgwDQk1TMQ8wDQYDVQQDDAZCTVMgQ0EwggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDDq40H55otFu4nxGKpk61X2HtC
w6e3JBHPaEM8yQmlBHxKkqpaqm815J3cTLTJch0+qSE/KWQeGGpv2UeR3rR0wLnw
a/drY833Xr/06HmVPCs0WJM7Mgs37G8YWCy3rCfXfwK1H2zTs4yJnY0JfH/t9e2z
alpxpen7cn0vgi3y9JzxRz0CBQz8Y1ey0nAPM20mnbvUxWP+fy+TaJNd82mnUELK
8g3hWNQ47NITouPZWW5X6jMlRBOdOw6xECN4o0LUnnI+nAAcXvQMSP9QAwFEhWUa
spCxdujh9EPqYMWhiWKU/xa+4wNyznz0CHm7VboCuTJlEY+fMMBgjRYehNv7AgMB
AAGjUzBRMB0GA1UdDgQWBBQmysBA+asL+E+H3B3QCV/TfmudCDAfBgNVHSMEGDAW
gBQmysBA+asL+E+H3B3QCV/TfmudCDAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
DQEBCwUAA4IBAQCFDGNz3XveCatnmVn4vNkCWgI10i5Jmzqs9+muvEGiNI4t9fdI
39SUVCu8ldPhSmapKFpNITsPNmQHS+vZeA35roJUd0zATrZAW2toq7GoihR6Oye6
Luw191g7nUefj2wa6Oj14f2DfGKcTH8vGOd8rxI/B1jJ4jLmGS9K1TXS8iOG3j6O
0k/3p24LHMMIUSZXw40Z+mdTLUgiy8rEsyfyoup/nsQeuGPuiGhDHcHAlXKGg0vv
dayIZG5QjeIbYPaCekuMtRPWmsYgtJ/f/JdxdWEefd6gToW5rcBkOS7yH3s7+yp6
xyxIZbUhchj+LB0igQFa3RtEP3ldwm34+Y54
-----END CERTIFICATE-----
)EOF";

// ===========================
// CONFIGURATION - CHANGE THESE
// ===========================

// WiFi credentials
const char* WIFI_SSID = "Telia-C229E4";
const char* WIFI_PASSWORD = "8UXJVPSBBR43QB";

// MQTT Broker settings
const char* MQTT_SERVER = "192.168.1.100";  // Your BMS server IP
const int MQTT_PORT = 8883;                  // 8883 for TLS, 1883 for non-TLS
const char* MQTT_USERNAME = "node_1"; // Get from BMS web panel
const char* MQTT_PASSWORD = "ssdmeljmkth"; // Get from BMS web panel
const char* NODE_ID = "1";            // Your unique node ID

// SHT10 sensor pins
#define SHT10_DATA_PIN 10
#define SHT10_SCK_PIN  11

// Publish interval (milliseconds)
const unsigned long PUBLISH_INTERVAL = 30000; // 30 seconds

// ===========================
// GLOBAL OBJECTS
// ===========================

SHT1x sht10(SHT10_DATA_PIN, SHT10_SCK_PIN);
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// Topics
String dataTopic;
String statusTopic;
String commandTopic;

// Timing
unsigned long lastPublish = 0;

// ===========================
// SETUP
// ===========================

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n=================================");
  Serial.println("ESP32-S3 BMS Node with SHT10");
  Serial.println("=================================\n");
  
  // Print memory info
  Serial.print("Free heap: ");
  Serial.println(ESP.getFreeHeap());
  Serial.print("PSRAM available: ");
  Serial.println(ESP.getPsramSize());
  
  // Initialize topics
  // Topics must match username format: node_<node_id>
  String topicPrefix = String("node_") + NODE_ID;
  dataTopic = String("bms/node/") + topicPrefix + "/data";
  statusTopic = String("bms/node/") + topicPrefix + "/status";
  commandTopic = String("bms/node/") + topicPrefix + "/command";
  
  // Connect to WiFi
  connectWiFi();
  
  // Setup MQTT with TLS
  Serial.println("Setting up MQTT...");
  espClient.setCACert(ca_cert); // Use CA certificate for secure TLS
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(256); // Buffer for JSON (reduced to save memory)
  
  // Connect to MQTT
  connectMQTT();
  
  // Send online status
  publishStatus("online");
  
  Serial.println("Setup complete!\n");
}

// ===========================
// MAIN LOOP
// ===========================

void loop() {
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();
  
  // Publish sensor data at intervals
  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;
    publishSensorData();
  }
  
  delay(100);
}

// ===========================
// WiFi FUNCTIONS
// ===========================

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    yield(); // Feed watchdog
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm\n");
  } else {
    Serial.println("\nWiFi connection failed!");
    Serial.println("Restarting...");
    delay(5000);
    ESP.restart();
  }
}

// ===========================
// MQTT FUNCTIONS
// ===========================

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT broker...");
    
    // Generate client ID
    String clientId = "ESP32-" + String(NODE_ID);
    
    // Attempt to connect
    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
      Serial.println(" connected!");
      
      // Subscribe to command topic
      mqttClient.subscribe(commandTopic.c_str());
      Serial.print("Subscribed to: ");
      Serial.println(commandTopic);
      
      return;
    } else {
      Serial.print(" failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(". Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");
  
  // Convert payload to string
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  // Parse JSON command
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }
  
  // Handle commands
  const char* cmd = doc["command"];
  if (cmd) {
    handleCommand(cmd, doc);
  }
}

void handleCommand(const char* command, JsonDocument& params) {
  Serial.print("Handling command: ");
  Serial.println(command);
  
  if (strcmp(command, "read") == 0) {
    // Force immediate reading
    publishSensorData();
  } 
  else if (strcmp(command, "reset") == 0) {
    // Reset the device
    Serial.println("Resetting device...");
    publishStatus("offline");
    delay(1000);
    ESP.restart();
  }
  else if (strcmp(command, "status") == 0) {
    // Send status update
    publishStatus("online");
  }
  else {
    Serial.println("Unknown command");
  }
}

// ===========================
// SENSOR FUNCTIONS
// ===========================

void publishSensorData() {
  Serial.println("Reading SHT10 sensor...");
  
  // Read sensor
  float temperature = sht10.readTemperatureC();
  float humidity = sht10.readHumidity();
  
  // Check for valid readings
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from SHT10 sensor!");
    return;
  }
  
  // Calculate dew point
  float dewPoint = calculateDewPoint(temperature, humidity);
  
  // Print readings
  Serial.print("Temperature: ");
  Serial.print(temperature, 2);
  Serial.println(" °C");
  
  Serial.print("Humidity: ");
  Serial.print(humidity, 2);
  Serial.println(" %");
  
  Serial.print("Dew Point: ");
  Serial.print(dewPoint, 2);
  Serial.println(" °C");
  
  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["node_id"] = NODE_ID;
  doc["timestamp"] = millis();
  doc["temperature"] = round(temperature * 100) / 100.0;
  doc["humidity"] = round(humidity * 100) / 100.0;
  doc["dewpoint"] = round(dewPoint * 100) / 100.0;
  doc["rssi"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000;
  
  // Serialize to string
  String payload;
  serializeJson(doc, payload);
  
  // Publish
  if (mqttClient.publish(dataTopic.c_str(), payload.c_str())) {
    Serial.println("Data published successfully!");
  } else {
    Serial.println("Failed to publish data!");
  }
  
  Serial.println();
}

void publishStatus(const char* status) {
  StaticJsonDocument<128> doc;
  doc["node_id"] = NODE_ID;
  doc["status"] = status;
  doc["timestamp"] = millis();
  doc["ip"] = WiFi.localIP().toString();
  
  String payload;
  serializeJson(doc, payload);
  
  mqttClient.publish(statusTopic.c_str(), payload.c_str(), true); // Retained message
  
  Serial.print("Status published: ");
  Serial.println(status);
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

float calculateDewPoint(float temperature, float humidity) {
  // Magnus formula
  float a = 17.27;
  float b = 237.7;
  float alpha = ((a * temperature) / (b + temperature)) + log(humidity / 100.0);
  return (b * alpha) / (a - alpha);
}

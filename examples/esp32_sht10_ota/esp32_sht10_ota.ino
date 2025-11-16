/*
 * ESP32-S3 BMS Node with SHT10 and OTA (Over-The-Air) Update Support
 * 
 * This sketch includes OTA capability for remote firmware updates
 * 
 * Required Libraries:
 * - WiFi (built-in)
 * - HTTPUpdate (built-in)
 * - PubSubClient by Nick O'Leary
 * - ArduinoJson by Benoit Blanchon
 * - SHT1x by Practical Arduino
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <SHT1x-ESP.h>

// Firmware version
#define FIRMWARE_VERSION "1.1.1"

// ===========================
// TLS CERTIFICATE
// ===========================
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
// CONFIGURATION
// ===========================
const char* WIFI_SSID = "Telia-C229E4";
const char* WIFI_PASSWORD = "8UXJVPSBBR43QB";

const char* MQTT_SERVER = "192.168.1.172";
const int MQTT_PORT = 8883;
const char* MQTT_USERNAME = "node_1";
const char* MQTT_PASSWORD = "ssdmeljmkth";
const char* NODE_ID = "node_1";

#define SHT10_DATA_PIN 10
#define SHT10_SCK_PIN  11

const unsigned long PUBLISH_INTERVAL = 30000;

// ===========================
// GLOBAL OBJECTS
// ===========================
SHT1x sht10(SHT10_DATA_PIN, SHT10_SCK_PIN);
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

String dataTopic;
String statusTopic;
String commandTopic;
unsigned long lastPublish = 0;
bool otaInProgress = false;

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n=================================");
  Serial.println("ESP32-S3 BMS Node with OTA");
  Serial.printf("Firmware Version: %s\n", FIRMWARE_VERSION);
  Serial.println("=================================\n");
  
  // Initialize topics
  dataTopic = String("bms/node/") + NODE_ID + "/data";
  statusTopic = String("bms/node/") + NODE_ID + "/status";
  commandTopic = String("bms/node/") + NODE_ID + "/command";
  
  connectWiFi();
  
  // Setup MQTT with TLS
  Serial.println("Setting up MQTT...");
  espClient.setCACert(ca_cert);
  espClient.setInsecure();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512); // Larger buffer for OTA commands
  
  connectMQTT();
  publishStatus("online");
  
  Serial.println("Setup complete!\n");
}

void loop() {
  if (!otaInProgress) {
    if (!mqttClient.connected()) {
      connectMQTT();
    }
    mqttClient.loop();
    
    unsigned long now = millis();
    if (now - lastPublish >= PUBLISH_INTERVAL) {
      lastPublish = now;
      publishSensorData();
    }
  }
  
  delay(100);
}

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
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi failed! Restarting...");
    delay(5000);
    ESP.restart();
  }
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    String clientId = "ESP32-" + String(NODE_ID);
    
    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
      Serial.println(" connected!");
      mqttClient.subscribe(commandTopic.c_str());
      return;
    } else {
      Serial.print(" failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(". Retrying in 5s...");
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Command received: ");
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, message) == DeserializationError::Ok) {
    const char* cmd = doc["command"];
    
    if (cmd && strcmp(cmd, "ota_update") == 0) {
      const char* firmwareUrl = doc["firmware_url"];
      if (firmwareUrl) {
        performOTAUpdate(firmwareUrl);
      }
    } else if (cmd && strcmp(cmd, "read") == 0) {
      publishSensorData();
    } else if (cmd && strcmp(cmd, "version") == 0) {
      publishVersion();
    }
  }
}

void performOTAUpdate(const char* url) {
  otaInProgress = true;
  
  Serial.println("\n=================================");
  Serial.println("Starting OTA Update");
  Serial.println("=================================");
  Serial.print("Firmware URL: ");
  Serial.println(url);
  
  // Publish status
  StaticJsonDocument<128> doc;
  doc["node_id"] = NODE_ID;
  doc["status"] = "updating";
  doc["message"] = "OTA update in progress";
  
  String payload;
  serializeJson(doc, payload);
  mqttClient.publish(statusTopic.c_str(), payload.c_str(), true);
  
  // Perform OTA update
  WiFiClient client;
  httpUpdate.setLedPin(LED_BUILTIN, LOW);
  
  httpUpdate.onStart([]() {
    Serial.println("OTA Update started");
  });
  
  httpUpdate.onEnd([]() {
    Serial.println("\nOTA Update finished!");
  });
  
  httpUpdate.onProgress([](int current, int total) {
    Serial.println("Progress: %d%%\r", (current * 100) / total);
  });
  
  httpUpdate.onError([](int error) {
    Serial.printf("OTA Error[%d]: ", error);
    Serial.println(httpUpdate.getLastErrorString().c_str());
  });
  
  t_httpUpdate_return ret = httpUpdate.update(client, url);
  
  switch (ret) {
    case HTTP_UPDATE_FAILED:
      Serial.printf("OTA Update failed Error (%d): %s\n", 
        httpUpdate.getLastError(), httpUpdate.getLastErrorString().c_str());
      
      // Publish failure status
      doc.clear();
      doc["node_id"] = NODE_ID;
      doc["status"] = "online";
      doc["message"] = "OTA update failed";
      serializeJson(doc, payload);
      mqttClient.publish(statusTopic.c_str(), payload.c_str(), true);
      
      otaInProgress = false;
      break;
      
    case HTTP_UPDATE_NO_UPDATES:
      Serial.println("No updates available");
      otaInProgress = false;
      break;
      
    case HTTP_UPDATE_OK:
      Serial.println("Update successful! Rebooting...");
      delay(1000);
      ESP.restart();
      break;
  }
}

void publishSensorData() {
  Serial.println("Reading sensor...");
  
  float temperature = sht10.readTemperatureC();
  float humidity = sht10.readHumidity();
  
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Sensor read failed!");
    return;
  }
  
  Serial.printf("Temp: %.1f°C, Humidity: %.1f%%\n", temperature, humidity);
  
  StaticJsonDocument<256> doc;
  doc["node_id"] = NODE_ID;
  doc["timestamp"] = millis();
  doc["temperature"] = round(temperature * 100) / 100.0;
  doc["humidity"] = round(humidity * 100) / 100.0;
  doc["rssi"] = WiFi.RSSI();
  doc["firmware_version"] = FIRMWARE_VERSION;
  
  String payload;
  serializeJson(doc, payload);
  
  if (mqttClient.publish(dataTopic.c_str(), payload.c_str())) {
    Serial.println("Published!");
  } else {
    Serial.println("Publish failed!");
  }
}

void publishStatus(const char* status) {
  StaticJsonDocument<128> doc;
  doc["node_id"] = NODE_ID;
  doc["status"] = status;
  doc["ip"] = WiFi.localIP().toString();
  doc["firmware_version"] = FIRMWARE_VERSION;
  
  String payload;
  serializeJson(doc, payload);
  mqttClient.publish(statusTopic.c_str(), payload.c_str(), true);
}

void publishVersion() {
  StaticJsonDocument<128> doc;
  doc["node_id"] = NODE_ID;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["uptime"] = millis() / 1000;
  
  String payload;
  serializeJson(doc, payload);
  mqttClient.publish(statusTopic.c_str(), payload.c_str());
  
  Serial.printf("Published version: %s\n", FIRMWARE_VERSION);
}

// API Configuration
const API_BASE = window.location.origin + '/api';
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// UI Elements
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const nodesContainer = document.getElementById('nodes-container');
const addNodeBtn = document.getElementById('add-node-btn');
const refreshBtn = document.getElementById('refresh-btn');
const nodeModal = document.getElementById('node-modal');
const nodeForm = document.getElementById('node-form');
const closeModal = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const detailsModal = document.getElementById('details-modal');
const closeDetails = document.getElementById('close-details');
const monitorContainer = document.getElementById('monitor-container');
const refreshMonitorBtn = document.getElementById('refresh-monitor-btn');
const autoRefreshCheckbox = document.getElementById('auto-refresh');
const showChartsCheckbox = document.getElementById('show-charts');
let monitorInterval = null;
let temperatureChart = null;
let humidityChart = null;

// Initialize
if (authToken) {
    showMainScreen();
    loadNodes();
} else {
    showLoginScreen();
}

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
addNodeBtn.addEventListener('click', () => openNodeModal());
refreshBtn.addEventListener('click', loadNodes);
nodeForm.addEventListener('submit', handleNodeSubmit);
closeModal.addEventListener('click', closeNodeModal);
cancelBtn.addEventListener('click', closeNodeModal);
closeDetails.addEventListener('click', () => detailsModal.classList.add('hidden'));
refreshMonitorBtn.addEventListener('click', loadMonitorData);
autoRefreshCheckbox.addEventListener('change', toggleAutoRefresh);
showChartsCheckbox.addEventListener('change', toggleCharts);

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            throw new Error('Invalid credentials');
        }

        const data = await response.json();
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        
        showMainScreen();
        loadNodes();
    } catch (error) {
        loginError.textContent = error.message;
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showLoginScreen();
}

function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    mainScreen.classList.add('hidden');
}

function showMainScreen() {
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    if (currentUser) {
        userInfo.textContent = `Welcome, ${currentUser.username}`;
    }
}

// Nodes Management
async function loadNodes() {
    try {
        const response = await fetch(`${API_BASE}/nodes`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load nodes');
        }

        const nodes = await response.json();
        displayNodes(nodes);
    } catch (error) {
        console.error('Error loading nodes:', error);
        if (error.message.includes('401') || error.message.includes('403')) {
            handleLogout();
        }
    }
}

function displayNodes(nodes) {
    nodesContainer.innerHTML = '';

    if (nodes.length === 0) {
        nodesContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No nodes found. Click "Add Node" to get started.</p>';
        return;
    }

    nodes.forEach(node => {
        const card = createNodeCard(node);
        nodesContainer.appendChild(card);
    });
}

function createNodeCard(node) {
    const card = document.createElement('div');
    card.className = 'node-card';

    const statusClass = node.status === 'active' ? 'status-active' : 'status-inactive';
    const lastSeen = node.last_seen 
        ? new Date(node.last_seen).toLocaleString() 
        : 'Never';

    card.innerHTML = `
        <h3>${node.name}</h3>
        <div class="node-info">
            <p><strong>ID:</strong> ${node.node_id}</p>
            <p><strong>Address:</strong> ${node.address}</p>
            <p><strong>Status:</strong> <span class="node-status ${statusClass}">${node.status}</span></p>
            <p><strong>Last Seen:</strong> ${lastSeen}</p>
        </div>
        <div class="node-actions">
            <button class="btn-view" onclick="viewNodeDetails('${node.node_id}')">View</button>
            <button class="btn-ota" onclick="openOtaModalForNode('${node.node_id}', '${node.name}')">OTA</button>
            <button class="btn-edit" onclick="editNode('${node.node_id}')">Edit</button>
            <button class="btn-delete" onclick="deleteNode('${node.node_id}')">Delete</button>
        </div>
    `;

    return card;
}

// Node Modal
function openNodeModal(nodeData = null) {
    const modalTitle = document.getElementById('modal-title');
    const nodeIdInput = document.getElementById('node-id');
    const mqttCredentials = document.getElementById('mqtt-credentials');

    mqttCredentials.classList.add('hidden');
    
    if (nodeData) {
        modalTitle.textContent = 'Edit Node';
        nodeIdInput.value = nodeData.node_id;
        nodeIdInput.disabled = true;
        document.getElementById('node-name').value = nodeData.name;
        document.getElementById('node-address').value = nodeData.address;
        document.getElementById('node-description').value = nodeData.description || '';
    } else {
        modalTitle.textContent = 'Add New Node';
        nodeIdInput.disabled = false;
        nodeForm.reset();
    }

    nodeModal.classList.remove('hidden');
}

function closeNodeModal() {
    nodeModal.classList.add('hidden');
    nodeForm.reset();
}

async function handleNodeSubmit(e) {
    e.preventDefault();

    const nodeData = {
        node_id: document.getElementById('node-id').value,
        name: document.getElementById('node-name').value,
        address: document.getElementById('node-address').value,
        description: document.getElementById('node-description').value
    };

    const isEdit = document.getElementById('node-id').disabled;

    try {
        const url = isEdit 
            ? `${API_BASE}/nodes/${nodeData.node_id}`
            : `${API_BASE}/nodes`;
        
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(nodeData)
        });

        if (!response.ok) {
            throw new Error('Failed to save node');
        }

        const result = await response.json();

        if (!isEdit && result.mqtt_username && result.mqtt_password) {
            document.getElementById('mqtt-username').textContent = result.mqtt_username;
            document.getElementById('mqtt-password').textContent = result.mqtt_password;
            document.getElementById('mqtt-credentials').classList.remove('hidden');
            
            // Hide form fields
            document.querySelectorAll('.form-group').forEach(el => el.style.display = 'none');
            document.querySelector('.modal-actions').style.display = 'none';

            // Enable ESP32 code generation
            const showBtn = document.getElementById('show-esp32-code-btn');
            showBtn.onclick = async () => {
                await showEsp32Code(result.node_id || document.getElementById('node-id').value);
            };
        } else {
            closeNodeModal();
            loadNodes();
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function editNode(nodeId) {
    try {
        const response = await fetch(`${API_BASE}/nodes/${nodeId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load node');
        }

        const node = await response.json();
        openNodeModal(node);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteNode(nodeId) {
    if (!confirm('Are you sure you want to delete this node?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/nodes/${nodeId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to delete node');
        }

        loadNodes();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function viewNodeDetails(nodeId) {
    try {
        const [nodeRes, dataRes] = await Promise.all([
            fetch(`${API_BASE}/nodes/${nodeId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_BASE}/nodes/${nodeId}/data?limit=10`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        ]);

        const node = await nodeRes.json();
        const data = await dataRes.json();

        displayNodeDetails(node, data);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function displayNodeDetails(node, dataHistory) {
    const content = document.getElementById('node-details-content');
    
    let dataHTML = '<p>No data received yet</p>';
    if (dataHistory.length > 0) {
        dataHTML = dataHistory.map(item => `
            <div class="data-item">
                <div><strong>Time:</strong> ${new Date(item.received_at).toLocaleString()}</div>
                <div><strong>Data:</strong> ${JSON.stringify(item.data, null, 2)}</div>
            </div>
        `).join('');
    }

    content.innerHTML = `
        <div class="details-section">
            <h3>Node Information</h3>
            <p><strong>ID:</strong> ${node.node_id}</p>
            <p><strong>Name:</strong> ${node.name}</p>
            <p><strong>Address:</strong> ${node.address}</p>
            <p><strong>Description:</strong> ${node.description || 'N/A'}</p>
            <p><strong>Status:</strong> ${node.status}</p>
            <p><strong>Last Seen:</strong> ${node.last_seen ? new Date(node.last_seen).toLocaleString() : 'Never'}</p>
        </div>
        <div class="details-section">
            <h3>Recent Data (Last 10)</h3>
            ${dataHTML}
        </div>
    `;

    detailsModal.classList.remove('hidden');
}

// Tab Management
function switchTab(tabName) {
    // Update button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load appropriate data
    if (tabName === 'monitor') {
        initializeCharts();
        loadMonitorData();
        if (autoRefreshCheckbox.checked) {
            startAutoRefresh();
        }
    } else if (tabName === 'firmware') {
        loadFirmwareList();
        stopAutoRefresh();
    } else {
        stopAutoRefresh();
    }
}

// Monitor Functions
async function loadMonitorData() {
    try {
        const response = await fetch(`${API_BASE}/nodes`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load nodes');
        }

        const nodes = await response.json();
        const activeNodes = nodes.filter(n => n.status === 'active');
        
        // Fetch latest data for each active node
        const nodeDataPromises = activeNodes.map(async node => {
            const dataRes = await fetch(`${API_BASE}/nodes/${node.node_id}/data?limit=1`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await dataRes.json();
            return { ...node, latestData: data[0] };
        });
        
        const nodesWithData = await Promise.all(nodeDataPromises);
        displayMonitorData(nodesWithData);
        
        // Update charts if they're visible
        if (showChartsCheckbox.checked) {
            updateCharts();
        }
    } catch (error) {
        console.error('Error loading monitor data:', error);
    }
}

function displayMonitorData(nodes) {
    monitorContainer.innerHTML = '';

    if (nodes.length === 0) {
        monitorContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No active nodes found.</p>';
        return;
    }

    nodes.forEach(node => {
        const card = createMonitorCard(node);
        monitorContainer.appendChild(card);
    });
}

function createMonitorCard(node) {
    const card = document.createElement('div');
    card.className = 'monitor-card';

    let sensorDataHTML = '<p style="color: #999;">No data available</p>';
    
    if (node.latestData && node.latestData.data) {
        const data = node.latestData.data;
        const timestamp = new Date(node.latestData.received_at).toLocaleString();
        
        sensorDataHTML = `
            <div class="sensor-grid">
                ${data.temperature !== undefined ? `
                    <div class="sensor-value">
                        <div class="sensor-label">Temperature</div>
                        <div class="sensor-reading">${data.temperature}°C</div>
                    </div>
                ` : ''}
                ${data.humidity !== undefined ? `
                    <div class="sensor-value">
                        <div class="sensor-label">Humidity</div>
                        <div class="sensor-reading">${data.humidity}%</div>
                    </div>
                ` : ''}
                ${data.dewpoint !== undefined ? `
                    <div class="sensor-value">
                        <div class="sensor-label">Dew Point</div>
                        <div class="sensor-reading">${data.dewpoint}°C</div>
                    </div>
                ` : ''}
                ${data.rssi !== undefined ? `
                    <div class="sensor-value">
                        <div class="sensor-label">Signal</div>
                        <div class="sensor-reading">${data.rssi} dBm</div>
                    </div>
                ` : ''}
            </div>
            <div class="monitor-timestamp">Updated: ${timestamp}</div>
        `;
    }

    card.innerHTML = `
        <div class="monitor-header">
            <h3>${node.name}</h3>
            <span class="node-status status-active">●</span>
        </div>
        <div class="monitor-info">
            <p><strong>ID:</strong> ${node.node_id}</p>
            <p><strong>Location:</strong> ${node.address}</p>
        </div>
        ${sensorDataHTML}
    `;

    return card;
}

function toggleAutoRefresh() {
    if (autoRefreshCheckbox.checked) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
}

function startAutoRefresh() {
    stopAutoRefresh(); // Clear any existing interval
    monitorInterval = setInterval(loadMonitorData, 10000); // Refresh every 10 seconds
}

function stopAutoRefresh() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
}

// ESP32 Code Generation
async function showEsp32Code(nodeId) {
    try {
        const response = await fetch(`${API_BASE}/nodes/${nodeId}/esp32-code`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch ESP32 code data');
        }

        const data = await response.json();
        const code = generateEsp32Code(data);
        
        document.getElementById('esp32-code').textContent = code;
        document.getElementById('esp32-code-section').classList.remove('hidden');
        document.getElementById('show-esp32-code-btn').style.display = 'none';
        
        // Setup copy button
        document.getElementById('copy-code-btn').onclick = () => {
            navigator.clipboard.writeText(code);
            const btn = document.getElementById('copy-code-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = originalText, 2000);
        };
    } catch (error) {
        alert('Error generating ESP32 code: ' + error.message);
    }
}

// Charts Management
function initializeCharts() {
    if (temperatureChart || humidityChart) return; // Already initialized
    
    const tempCtx = document.getElementById('temperature-chart').getContext('2d');
    const humCtx = document.getElementById('humidity-chart').getContext('2d');
    
    temperatureChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            }
        }
    });
    
    humidityChart = new Chart(humCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Humidity (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            }
        }
    });
}

async function updateCharts() {
    if (!temperatureChart || !humidityChart) return;
    
    try {
        const response = await fetch(`${API_BASE}/nodes`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) return;
        
        const nodes = await response.json();
        const activeNodes = nodes.filter(n => n.status === 'active');
        
        // Fetch historical data for each node (last 20 points)
        const chartDataPromises = activeNodes.map(async node => {
            const dataRes = await fetch(`${API_BASE}/nodes/${node.node_id}/data?limit=20`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await dataRes.json();
            return { node, data: data.reverse() }; // Reverse to get chronological order
        });
        
        const nodesData = await Promise.all(chartDataPromises);
        
        // Update temperature chart
        temperatureChart.data.datasets = nodesData.map(({ node, data }) => ({
            label: node.name,
            data: data.map(d => d.data.temperature),
            borderColor: getNodeColor(node.node_id),
            backgroundColor: getNodeColor(node.node_id, 0.1),
            tension: 0.4
        }));
        
        // Use timestamps from first node for labels
        if (nodesData.length > 0 && nodesData[0].data.length > 0) {
            temperatureChart.data.labels = nodesData[0].data.map(d => 
                new Date(d.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            );
        }
        
        // Update humidity chart
        humidityChart.data.datasets = nodesData.map(({ node, data }) => ({
            label: node.name,
            data: data.map(d => d.data.humidity),
            borderColor: getNodeColor(node.node_id),
            backgroundColor: getNodeColor(node.node_id, 0.1),
            tension: 0.4
        }));
        
        if (nodesData.length > 0 && nodesData[0].data.length > 0) {
            humidityChart.data.labels = nodesData[0].data.map(d => 
                new Date(d.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            );
        }
        
        temperatureChart.update();
        humidityChart.update();
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

function getNodeColor(nodeId, alpha = 1) {
    const colors = [
        `rgba(54, 162, 235, ${alpha})`,   // Blue
        `rgba(255, 99, 132, ${alpha})`,   // Red
        `rgba(75, 192, 192, ${alpha})`,   // Teal
        `rgba(255, 159, 64, ${alpha})`,   // Orange
        `rgba(153, 102, 255, ${alpha})`,  // Purple
        `rgba(255, 205, 86, ${alpha})`    // Yellow
    ];
    
    // Simple hash function to assign consistent colors
    let hash = 0;
    for (let i = 0; i < nodeId.length; i++) {
        hash = nodeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function toggleCharts() {
    const chartsSection = document.getElementById('charts-section');
    if (showChartsCheckbox.checked) {
        chartsSection.style.display = 'grid';
        if (!temperatureChart || !humidityChart) {
            initializeCharts();
        }
        updateCharts();
    } else {
        chartsSection.style.display = 'none';
    }
}

function generateEsp32Code(data) {
    // Get the current server IP (from browser location)
    const serverIp = window.location.hostname;
    
    return `/*
 * ESP32-S3 BMS Node with SHT10 and OTA (Over-The-Air) Update Support
 * Auto-generated configuration for node: ${data.node_id}
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
#define FIRMWARE_VERSION "1.0.0"

// ===========================
// TLS CERTIFICATE
// ===========================
const char ca_cert[] = R"EOF(
${data.ca_certificate})EOF";

// ===========================
// CONFIGURATION
// ===========================

// WiFi credentials - UPDATE THESE
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings
const char* MQTT_SERVER = "${serverIp}";  // Your BMS server IP
const int MQTT_PORT = 8883;  // TLS port
const char* MQTT_USERNAME = "${data.mqtt_username}";
const char* MQTT_PASSWORD = "${data.mqtt_password}";
const char* NODE_ID = "${data.node_id}";

// SHT10 sensor pins - UPDATE THESE FOR YOUR WIRING
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

String dataTopic;
String statusTopic;
String commandTopic;
unsigned long lastPublish = 0;
bool otaInProgress = false;

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\\n\\n=================================");
  Serial.println("ESP32-S3 BMS Node with OTA");
  Serial.printf("Firmware Version: %s\\n", FIRMWARE_VERSION);
  Serial.println("=================================\\n");
  
  // Initialize topics
  String topicPrefix = String("node_") + NODE_ID;
  dataTopic = String("bms/node/") + topicPrefix + "/data";
  statusTopic = String("bms/node/") + topicPrefix + "/status";
  commandTopic = String("bms/node/") + topicPrefix + "/command";
  
  // Connect to WiFi
  connectWiFi();
  
  // Setup MQTT with TLS
  Serial.println("Setting up MQTT...");
  espClient.setCACert(ca_cert);
  espClient.setInsecure(); // For IP address connections
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512); // Larger buffer for OTA commands
  
  connectMQTT();
  publishStatus("online");
  
  Serial.println("Setup complete!\\n");
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
    Serial.println("\\nWiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\\nWiFi failed! Restarting...");
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
  
  Serial.println("\\n=================================");
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
    Serial.println("\\nOTA Update finished!");
  });
  
  httpUpdate.onProgress([](int current, int total) {
    Serial.printf("Progress: %d%%\\r", (current * 100) / total);
    Serial.println();
  });
  
  httpUpdate.onError([](int error) {
    Serial.printf("OTA Error[%d]: ", error);
    Serial.println(httpUpdate.getLastErrorString().c_str());
  });
  
  t_httpUpdate_return ret = httpUpdate.update(client, url);
  
  switch (ret) {
    case HTTP_UPDATE_FAILED:
      Serial.printf("OTA Update failed Error (%d): %s\\n", 
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
  
  Serial.printf("Temp: %.1f°C, Humidity: %.1f%%\\n", temperature, humidity);
  
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
  
  Serial.printf("Published version: %s\\n", FIRMWARE_VERSION);
}
`;
}

// Firmware Management
const uploadFirmwareBtn = document.getElementById('upload-firmware-btn');
const refreshFirmwareBtn = document.getElementById('refresh-firmware-btn');
const firmwareUploadArea = document.getElementById('firmware-upload');
const firmwareFileInput = document.getElementById('firmware-file');
const doUploadBtn = document.getElementById('do-upload-btn');
const cancelUploadBtn = document.getElementById('cancel-upload-btn');
const uploadProgress = document.getElementById('upload-progress');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const uploadStatus = document.getElementById('upload-status');
const firmwareList = document.getElementById('firmware-list');
const otaModal = document.getElementById('ota-modal');
const closeOta = document.getElementById('close-ota');
const cancelOtaBtn = document.getElementById('cancel-ota-btn');
const startOtaBtn = document.getElementById('start-ota-btn');
const otaNodeName = document.getElementById('ota-node-name');
const otaFirmwareSelect = document.getElementById('ota-firmware-select');
const otaStatus = document.getElementById('ota-status');
let currentOtaNodeId = null;

uploadFirmwareBtn.addEventListener('click', () => {
    firmwareUploadArea.classList.toggle('hidden');
});

refreshFirmwareBtn.addEventListener('click', loadFirmwareList);
cancelUploadBtn.addEventListener('click', () => {
    firmwareUploadArea.classList.add('hidden');
    firmwareFileInput.value = '';
    uploadProgress.classList.add('hidden');
});

doUploadBtn.addEventListener('click', uploadFirmware);
closeOta.addEventListener('click', closeOtaModal);
cancelOtaBtn.addEventListener('click', closeOtaModal);
startOtaBtn.addEventListener('click', startOtaUpdate);

async function uploadFirmware() {
    const file = firmwareFileInput.files[0];
    if (!file) {
        alert('Please select a firmware file');
        return;
    }

    if (!file.name.endsWith('.bin')) {
        alert('Please select a .bin file');
        return;
    }

    const formData = new FormData();
    formData.append('firmware', file);

    try {
        doUploadBtn.disabled = true;
        uploadProgress.classList.remove('hidden');
        uploadStatus.textContent = 'Uploading...';
        uploadProgressBar.style.width = '0%';

        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                uploadProgressBar.style.width = percent + '%';
                uploadStatus.textContent = `Uploading... ${Math.round(percent)}%`;
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                uploadStatus.textContent = 'Upload complete!';
                uploadProgressBar.style.width = '100%';
                
                setTimeout(() => {
                    firmwareUploadArea.classList.add('hidden');
                    firmwareFileInput.value = '';
                    uploadProgress.classList.add('hidden');
                    doUploadBtn.disabled = false;
                    loadFirmwareList();
                }, 1500);
            } else {
                throw new Error('Upload failed');
            }
        });

        xhr.addEventListener('error', () => {
            uploadStatus.textContent = 'Upload failed!';
            doUploadBtn.disabled = false;
        });

        xhr.open('POST', `${API_BASE}/firmware/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        xhr.send(formData);

    } catch (error) {
        console.error('Upload error:', error);
        uploadStatus.textContent = 'Upload failed!';
        doUploadBtn.disabled = false;
    }
}

async function loadFirmwareList() {
    try {
        const response = await fetch(`${API_BASE}/firmware/list`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load firmware list');
        }

        const data = await response.json();
        displayFirmwareList(data.firmware);
    } catch (error) {
        console.error('Error loading firmware:', error);
    }
}

function displayFirmwareList(firmware) {
    firmwareList.innerHTML = '';

    if (firmware.length === 0) {
        firmwareList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No firmware files uploaded yet.</p>';
        return;
    }

    firmware.forEach(fw => {
        const item = document.createElement('div');
        item.className = 'firmware-item';

        const uploadedDate = new Date(fw.uploadedAt).toLocaleString();
        const fileSize = (fw.size / 1024).toFixed(2) + ' KB';

        item.innerHTML = `
            <div class="firmware-info">
                <h4>${fw.filename}</h4>
                <div class="firmware-meta">
                    <span>Size: ${fileSize}</span> | 
                    <span>Uploaded: ${uploadedDate}</span>
                </div>
            </div>
            <div class="firmware-actions">
                <button class="btn-ota" onclick="openOtaModal('${fw.filename}')">Update Node</button>
                <button class="btn-download" onclick="downloadFirmware('${fw.filename}')">Download</button>
                <button class="btn-delete" onclick="deleteFirmware('${fw.filename}')">Delete</button>
            </div>
        `;

        firmwareList.appendChild(item);
    });
}

function openOtaModal(firmwareFilename) {
    loadNodesForOta(firmwareFilename);
    otaModal.classList.remove('hidden');
    otaStatus.classList.add('hidden');
}

function closeOtaModal() {
    otaModal.classList.add('hidden');
    currentOtaNodeId = null;
    otaStatus.classList.add('hidden');
}

async function loadNodesForOta(firmwareFilename) {
    try {
        const response = await fetch(`${API_BASE}/nodes`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load nodes');
        }

        const nodes = await response.json();
        populateNodeSelect(nodes, firmwareFilename);
    } catch (error) {
        console.error('Error loading nodes:', error);
    }
}

function populateNodeSelect(nodes, firmwareFilename) {
    otaFirmwareSelect.innerHTML = '';
    
    if (nodes.length === 0) {
        otaFirmwareSelect.innerHTML = '<option value="">No nodes available</option>';
        startOtaBtn.disabled = true;
        return;
    }

    otaFirmwareSelect.innerHTML = '<option value="">Select a node...</option>';
    
    nodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.node_id;
        option.textContent = `${node.name} (${node.node_id}) - ${node.status}`;
        option.dataset.filename = firmwareFilename;
        otaFirmwareSelect.appendChild(option);
    });

    startOtaBtn.disabled = false;
}

async function startOtaUpdate() {
    let nodeId, firmwareFilename;
    
    // Check if we're in firmware-first mode (dataset.filename) or node-first mode (currentOtaNodeId)
    if (currentOtaNodeId) {
        // Node-first mode: node selected, firmware in dropdown
        nodeId = currentOtaNodeId;
        firmwareFilename = otaFirmwareSelect.value;
        
        if (!firmwareFilename) {
            alert('Please select a firmware');
            return;
        }
    } else {
        // Firmware-first mode: firmware selected, node in dropdown
        nodeId = otaFirmwareSelect.value;
        const selectedOption = otaFirmwareSelect.options[otaFirmwareSelect.selectedIndex];
        firmwareFilename = selectedOption.dataset.filename;
        
        if (!nodeId) {
            alert('Please select a node');
            return;
        }
    }

    const firmwareUrl = `${window.location.origin}/api/firmware/download/${firmwareFilename}`;

    try {
        startOtaBtn.disabled = true;
        otaStatus.textContent = 'Sending OTA update command...';
        otaStatus.className = 'status-message info';
        otaStatus.classList.remove('hidden');

        const response = await fetch(`${API_BASE}/nodes/${nodeId}/ota-update`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firmwareUrl })
        });

        if (!response.ok) {
            throw new Error('OTA update command failed');
        }

        otaStatus.textContent = 'OTA update command sent successfully! Check node status in Monitor tab.';
        otaStatus.className = 'status-message success';

        setTimeout(() => {
            closeOtaModal();
        }, 3000);

    } catch (error) {
        console.error('OTA update error:', error);
        otaStatus.textContent = 'Failed to send OTA update command: ' + error.message;
        otaStatus.className = 'status-message error';
        startOtaBtn.disabled = false;
    }
}

function downloadFirmware(filename) {
    const url = `${API_BASE}/firmware/download/${filename}`;
    window.open(url, '_blank');
}

async function deleteFirmware(filename) {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/firmware/${filename}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to delete firmware');
        }

        loadFirmwareList();
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete firmware');
    }
}

async function openOtaModalForNode(nodeId, nodeName) {
    currentOtaNodeId = nodeId;
    otaNodeName.textContent = nodeName;
    
    try {
        const response = await fetch(`${API_BASE}/firmware/list`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load firmware list');
        }

        const data = await response.json();
        
        otaFirmwareSelect.innerHTML = '';
        
        if (data.firmware.length === 0) {
            otaFirmwareSelect.innerHTML = '<option value="">No firmware available - upload one first</option>';
            startOtaBtn.disabled = true;
        } else {
            otaFirmwareSelect.innerHTML = '<option value="">Select firmware...</option>';
            data.firmware.forEach(fw => {
                const option = document.createElement('option');
                option.value = fw.filename;
                option.textContent = `${fw.filename} (${(fw.size / 1024).toFixed(2)} KB)`;
                otaFirmwareSelect.appendChild(option);
            });
            startOtaBtn.disabled = false;
        }

        otaModal.classList.remove('hidden');
        otaStatus.classList.add('hidden');

    } catch (error) {
        console.error('Error loading firmware:', error);
        alert('Failed to load firmware list');
    }
}


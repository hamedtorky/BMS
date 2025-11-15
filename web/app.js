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
let monitorInterval = null;

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
        loadMonitorData();
        if (autoRefreshCheckbox.checked) {
            startAutoRefresh();
        }
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

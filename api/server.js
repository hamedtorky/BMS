const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const mqtt = require('mqtt');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bms_db',
  user: process.env.DB_USER || 'bms_user',
  password: process.env.DB_PASSWORD || 'bms_password_change_me',
});

// MQTT connection
let mqttClient;
const connectMQTT = () => {
  const options = {
    host: process.env.MQTT_HOST || 'localhost',
    port: parseInt(process.env.MQTT_PORT) || 8883,
    username: 'server',
    password: 'server_password',
    protocol: process.env.MQTT_USE_TLS === 'true' ? 'mqtts' : 'mqtt',
  };

  // Add TLS options if enabled
  if (process.env.MQTT_USE_TLS === 'true') {
    const certsPath = path.join(__dirname, 'certs');
    options.ca = fs.existsSync(path.join(certsPath, 'ca.crt')) 
      ? fs.readFileSync(path.join(certsPath, 'ca.crt'))
      : null;
    options.rejectUnauthorized = false; // Set to true in production with proper certs
  }

  mqttClient = mqtt.connect(options);

  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttClient.subscribe('bms/node/+/data');
    mqttClient.subscribe('bms/node/+/status');
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const parts = topic.split('/');
      const nodeId = parts[2];
      const messageType = parts[3];

      if (messageType === 'data') {
        const data = JSON.parse(message.toString());
        await pool.query(
          'INSERT INTO node_data (node_id, data) VALUES ($1, $2)',
          [nodeId, data]
        );
        
        // Update last_seen
        await pool.query(
          'UPDATE nodes SET last_seen = CURRENT_TIMESTAMP, status = $1 WHERE node_id = $2',
          ['active', nodeId]
        );
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('MQTT connection error:', error);
  });
};

// Initialize MQTT connection
connectMQTT();

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'change_this_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Auth endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'change_this_secret_key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all nodes
app.get('/api/nodes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, node_id, name, address, description, status, last_seen, created_at FROM nodes ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

// Get single node
app.get('/api/nodes/:nodeId', authenticateToken, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const result = await pool.query(
      'SELECT id, node_id, name, address, description, status, last_seen, created_at FROM nodes WHERE node_id = $1',
      [nodeId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching node:', error);
    res.status(500).json({ error: 'Failed to fetch node' });
  }
});

// Create new node
app.post('/api/nodes', authenticateToken, async (req, res) => {
  try {
    const { node_id, name, address, description } = req.body;

    if (!node_id || !name || !address) {
      return res.status(400).json({ error: 'node_id, name, and address are required' });
    }

    // Generate MQTT credentials
    const mqttUsername = `node_${node_id}`;
    const mqttPassword = Math.random().toString(36).substring(2, 15);

    const result = await pool.query(
      `INSERT INTO nodes (node_id, name, address, description, mqtt_username, mqtt_password)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, node_id, name, address, description, mqtt_username, mqtt_password, status, created_at`,
      [node_id, name, address, description || '', mqttUsername, mqttPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating node:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Node ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create node' });
    }
  }
});

// Update node
app.put('/api/nodes/:nodeId', authenticateToken, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { name, address, description } = req.body;

    const result = await pool.query(
      `UPDATE nodes 
       SET name = COALESCE($1, name), 
           address = COALESCE($2, address), 
           description = COALESCE($3, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE node_id = $4
       RETURNING id, node_id, name, address, description, status, last_seen`,
      [name, address, description, nodeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ error: 'Failed to update node' });
  }
});

// Delete node
app.delete('/api/nodes/:nodeId', authenticateToken, async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM nodes WHERE node_id = $1 RETURNING node_id',
      [nodeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json({ message: 'Node deleted successfully' });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

// Get node data
app.get('/api/nodes/:nodeId/data', authenticateToken, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const result = await pool.query(
      'SELECT data, received_at FROM node_data WHERE node_id = $1 ORDER BY received_at DESC LIMIT $2',
      [nodeId, limit]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching node data:', error);
    res.status(500).json({ error: 'Failed to fetch node data' });
  }
});

// Send command to node
app.post('/api/nodes/:nodeId/command', authenticateToken, async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const topic = `bms/node/${nodeId}/command`;
    mqttClient.publish(topic, JSON.stringify(command), { qos: 1 });

    res.json({ message: 'Command sent successfully' });
  } catch (error) {
    console.error('Error sending command:', error);
    res.status(500).json({ error: 'Failed to send command' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mqtt: mqttClient?.connected ? 'connected' : 'disconnected' 
  });
});

app.listen(PORT, () => {
  console.log(`BMS API server running on port ${PORT}`);
});

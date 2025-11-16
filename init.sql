-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create nodes table
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    address VARCHAR(255),
    description TEXT,
    mqtt_username VARCHAR(255),
    mqtt_password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'offline',
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create node_data table
CREATE TABLE IF NOT EXISTS node_data (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_node_data_node_id ON node_data(node_id);
CREATE INDEX IF NOT EXISTS idx_node_data_received_at ON node_data(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);

-- Location Tracker Database Schema

-- Create database (this will be handled by Docker)
-- CREATE DATABASE location_tracker;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    tenant_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants table for multi-tenancy
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Objects table for tracked items
CREATE TABLE IF NOT EXISTS objects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    description TEXT,
    tags TEXT[], -- PostgreSQL array for tags
    custom_fields JSONB DEFAULT '{}', -- JSON for flexible custom fields
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    created_by INTEGER REFERENCES users(id), -- Track who created the object
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Location history table for tracking movement
CREATE TABLE IF NOT EXISTS location_history (
    id SERIAL PRIMARY KEY,
    object_id INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    address VARCHAR(500),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_objects_tenant_id ON objects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_objects_type ON objects(type);
CREATE INDEX IF NOT EXISTS idx_objects_status ON objects(status);
CREATE INDEX IF NOT EXISTS idx_objects_updated ON objects(updated_at);
CREATE INDEX IF NOT EXISTS idx_objects_created_by ON objects(created_by);
CREATE INDEX IF NOT EXISTS idx_location_history_object_id ON location_history(object_id);
CREATE INDEX IF NOT EXISTS idx_location_history_timestamp ON location_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_location_history_tenant_id ON location_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- Insert default tenant
INSERT INTO tenants (id, name) VALUES (1, 'Demo Company') ON CONFLICT DO NOTHING;

-- Insert default admin user (password: 'password')
INSERT INTO users (id, email, password_hash, role, tenant_id) 
VALUES (1, 'admin@demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1) 
ON CONFLICT (email) DO NOTHING;

-- Update sequences to start from 2 (since we inserted ID 1)
SELECT setval('tenants_id_seq', 1, true);
SELECT setval('users_id_seq', 1, true);
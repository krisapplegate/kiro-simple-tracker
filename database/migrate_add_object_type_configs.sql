-- Migration: Add object type configurations with emoji support

-- Create object_type_configs table
CREATE TABLE IF NOT EXISTS object_type_configs (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    emoji VARCHAR(10) DEFAULT '📍', -- Default pin emoji
    color VARCHAR(7) DEFAULT '#6b7280', -- Default gray color
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type_name, tenant_id) -- Ensure unique type per tenant
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_object_type_configs_tenant_id ON object_type_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_object_type_configs_type_name ON object_type_configs(type_name);

-- Insert default type configurations
INSERT INTO object_type_configs (type_name, emoji, color, tenant_id) VALUES
    ('vehicle', '🚗', '#3b82f6', 1),
    ('person', '👤', '#10b981', 1),
    ('asset', '📦', '#8b5cf6', 1),
    ('device', '📱', '#f59e0b', 1)
ON CONFLICT (type_name, tenant_id) DO NOTHING;
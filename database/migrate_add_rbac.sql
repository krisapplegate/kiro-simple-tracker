-- Migration: Add Role-Based Access Control (RBAC) system

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    is_system_role BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, tenant_id)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL, -- objects, users, types, icons, groups
    action VARCHAR(50) NOT NULL,   -- create, read, update, delete, manage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Create groups table for organizing users
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, tenant_id)
);

-- Create user_roles junction table (users can have multiple roles)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Create user_groups junction table
CREATE TABLE IF NOT EXISTS user_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    added_by INTEGER REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, group_id)
);

-- Create group_roles junction table (groups can have roles)
CREATE TABLE IF NOT EXISTS group_roles (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, role_id)
);

-- Add role column to users table (primary role)
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_role_id INTEGER REFERENCES roles(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_groups_tenant_id ON groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_group_roles_group_id ON group_roles(group_id);
CREATE INDEX IF NOT EXISTS idx_group_roles_role_id ON group_roles(role_id);

-- Insert default permissions
INSERT INTO permissions (name, display_name, description, resource, action) VALUES
    -- Object permissions
    ('objects.create', 'Create Objects', 'Create new tracked objects', 'objects', 'create'),
    ('objects.read', 'View Objects', 'View tracked objects', 'objects', 'read'),
    ('objects.update', 'Edit Objects', 'Edit tracked objects', 'objects', 'update'),
    ('objects.delete', 'Delete Objects', 'Delete tracked objects', 'objects', 'delete'),
    ('objects.manage', 'Manage All Objects', 'Full access to all objects regardless of ownership', 'objects', 'manage'),
    
    -- User permissions
    ('users.create', 'Create Users', 'Create new user accounts', 'users', 'create'),
    ('users.read', 'View Users', 'View user accounts and profiles', 'users', 'read'),
    ('users.update', 'Edit Users', 'Edit user accounts and profiles', 'users', 'update'),
    ('users.delete', 'Delete Users', 'Delete user accounts', 'users', 'delete'),
    ('users.manage', 'Manage Users', 'Full user management including role assignments', 'users', 'manage'),
    
    -- Type configuration permissions
    ('types.create', 'Create Types', 'Create new object types and configurations', 'types', 'create'),
    ('types.read', 'View Types', 'View object types and configurations', 'types', 'read'),
    ('types.update', 'Edit Types', 'Edit object types and configurations', 'types', 'update'),
    ('types.delete', 'Delete Types', 'Delete object types and configurations', 'types', 'delete'),
    ('types.manage', 'Manage Types', 'Full access to type management', 'types', 'manage'),
    
    -- Icon permissions
    ('icons.create', 'Create Icons', 'Create and upload custom icons', 'icons', 'create'),
    ('icons.read', 'View Icons', 'View available icons', 'icons', 'read'),
    ('icons.update', 'Edit Icons', 'Edit icon configurations', 'icons', 'update'),
    ('icons.delete', 'Delete Icons', 'Delete custom icons', 'icons', 'delete'),
    ('icons.manage', 'Manage Icons', 'Full icon management', 'icons', 'manage'),
    
    -- Group permissions
    ('groups.create', 'Create Groups', 'Create user groups', 'groups', 'create'),
    ('groups.read', 'View Groups', 'View user groups', 'groups', 'read'),
    ('groups.update', 'Edit Groups', 'Edit user groups', 'groups', 'update'),
    ('groups.delete', 'Delete Groups', 'Delete user groups', 'groups', 'delete'),
    ('groups.manage', 'Manage Groups', 'Full group management', 'groups', 'manage'),
    
    -- Role permissions
    ('roles.create', 'Create Roles', 'Create new roles', 'roles', 'create'),
    ('roles.read', 'View Roles', 'View roles and permissions', 'roles', 'read'),
    ('roles.update', 'Edit Roles', 'Edit roles and permissions', 'roles', 'update'),
    ('roles.delete', 'Delete Roles', 'Delete roles', 'roles', 'delete'),
    ('roles.manage', 'Manage Roles', 'Full role and permission management', 'roles', 'manage'),
    
    -- System permissions
    ('system.admin', 'System Administration', 'Full system administration access', 'system', 'manage'),
    ('system.audit', 'System Audit', 'View system logs and audit trails', 'system', 'read')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles for tenant 1
INSERT INTO roles (name, display_name, description, tenant_id, is_system_role) VALUES
    ('super_admin', 'Super Administrator', 'Full system access with all permissions', 1, TRUE),
    ('admin', 'Administrator', 'Administrative access with user and object management', 1, TRUE),
    ('manager', 'Manager', 'Management access with team and object oversight', 1, TRUE),
    ('operator', 'Operator', 'Operational access for object management', 1, TRUE),
    ('viewer', 'Viewer', 'Read-only access to objects and data', 1, TRUE),
    ('user', 'Standard User', 'Basic user access for own objects', 1, TRUE)
ON CONFLICT (name, tenant_id) DO NOTHING;

-- Assign permissions to roles
-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'super_admin' AND r.tenant_id = 1
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin gets most permissions except system admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'admin' AND r.tenant_id = 1 
AND p.name NOT IN ('system.admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets object, user, group, and type management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'manager' AND r.tenant_id = 1 
AND p.resource IN ('objects', 'users', 'groups', 'types') 
AND p.action IN ('create', 'read', 'update', 'delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Operator gets object and type management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'operator' AND r.tenant_id = 1 
AND p.resource IN ('objects', 'types', 'icons') 
AND p.action IN ('create', 'read', 'update', 'delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer gets read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'viewer' AND r.tenant_id = 1 
AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User gets basic object access (own objects only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'user' AND r.tenant_id = 1 
AND p.name IN ('objects.create', 'objects.read', 'objects.update', 'objects.delete', 'types.read', 'icons.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Update existing admin user to have super_admin role
UPDATE users 
SET primary_role_id = (SELECT id FROM roles WHERE name = 'super_admin' AND tenant_id = 1)
WHERE email = 'admin@demo.com' AND tenant_id = 1;

-- Assign super_admin role to admin user
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, u.id
FROM users u, roles r 
WHERE u.email = 'admin@demo.com' AND u.tenant_id = 1 
AND r.name = 'super_admin' AND r.tenant_id = 1
ON CONFLICT (user_id, role_id) DO NOTHING;
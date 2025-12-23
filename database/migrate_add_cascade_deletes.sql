-- Migration: Add CASCADE DELETE to tenant foreign key constraints
-- This allows proper deletion of tenants and all their associated data

-- Drop existing foreign key constraints and recreate with CASCADE DELETE

-- Users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Objects table
ALTER TABLE objects DROP CONSTRAINT IF EXISTS objects_tenant_id_fkey;
ALTER TABLE objects ADD CONSTRAINT objects_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Location history table
ALTER TABLE location_history DROP CONSTRAINT IF EXISTS location_history_tenant_id_fkey;
ALTER TABLE location_history ADD CONSTRAINT location_history_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Object type configs table
ALTER TABLE object_type_configs DROP CONSTRAINT IF EXISTS object_type_configs_tenant_id_fkey;
ALTER TABLE object_type_configs ADD CONSTRAINT object_type_configs_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Roles table
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_tenant_id_fkey;
ALTER TABLE roles ADD CONSTRAINT roles_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Groups table
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_tenant_id_fkey;
ALTER TABLE groups ADD CONSTRAINT groups_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Images table (already has CASCADE DELETE, but ensure it's correct)
ALTER TABLE images DROP CONSTRAINT IF EXISTS images_tenant_id_fkey;
ALTER TABLE images ADD CONSTRAINT images_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
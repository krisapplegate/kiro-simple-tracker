import { query } from '../database.js'

export class RBACService {
  /**
   * Get all permissions for a user (including from roles and groups)
   */
  static async getUserPermissions(userId, tenantId) {
    try {
      const result = await query(`
        SELECT DISTINCT p.name, p.display_name, p.description, p.resource, p.action
        FROM permissions p
        WHERE p.id IN (
          -- Direct role permissions
          SELECT rp.permission_id 
          FROM user_roles ur 
          JOIN role_permissions rp ON ur.role_id = rp.role_id 
          WHERE ur.user_id = $1
          
          UNION
          
          -- Group role permissions
          SELECT rp.permission_id 
          FROM user_groups ug 
          JOIN group_roles gr ON ug.group_id = gr.group_id 
          JOIN role_permissions rp ON gr.role_id = rp.role_id 
          WHERE ug.user_id = $1
        )
      `, [userId])
      
      return result.rows
    } catch (error) {
      console.error('Error getting user permissions:', error)
      return []
    }
  }

  /**
   * Check if user has a specific permission
   */
  static async hasPermission(userId, tenantId, permissionName) {
    try {
      const result = await query(`
        SELECT 1
        FROM permissions p
        WHERE p.name = $3 AND p.id IN (
          -- Direct role permissions
          SELECT rp.permission_id 
          FROM user_roles ur 
          JOIN role_permissions rp ON ur.role_id = rp.role_id 
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = $1 AND r.tenant_id = $2
          
          UNION
          
          -- Group role permissions
          SELECT rp.permission_id 
          FROM user_groups ug 
          JOIN groups g ON ug.group_id = g.id
          JOIN group_roles gr ON ug.group_id = gr.group_id 
          JOIN role_permissions rp ON gr.role_id = rp.role_id 
          JOIN roles r ON gr.role_id = r.id
          WHERE ug.user_id = $1 AND g.tenant_id = $2 AND r.tenant_id = $2
        )
        LIMIT 1
      `, [userId, tenantId, permissionName])
      
      return result.rows.length > 0
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * Check if user can access an object (ownership or manage permission)
   */
  static async canAccessObject(userId, tenantId, objectId, action = 'read') {
    try {
      // Check if user has manage permission for all objects
      const hasManagePermission = await this.hasPermission(userId, tenantId, 'objects.manage')
      if (hasManagePermission) {
        return true
      }

      // Check specific action permission
      const hasActionPermission = await this.hasPermission(userId, tenantId, `objects.${action}`)
      if (!hasActionPermission) {
        return false
      }

      // For non-manage users, check ownership for update/delete actions
      if (action === 'update' || action === 'delete') {
        const result = await query(
          'SELECT created_by FROM objects WHERE id = $1 AND tenant_id = $2',
          [objectId, tenantId]
        )
        
        if (result.rows.length === 0) {
          return false
        }
        
        return result.rows[0].created_by === userId
      }

      return true
    } catch (error) {
      console.error('Error checking object access:', error)
      return false
    }
  }

  /**
   * Get user's roles
   */
  static async getUserRoles(userId, tenantId) {
    try {
      const result = await query(`
        SELECT DISTINCT r.id, r.name, r.display_name, r.description, r.is_system_role
        FROM roles r
        WHERE r.tenant_id = $2 AND r.id IN (
          -- Direct roles
          SELECT ur.role_id FROM user_roles ur WHERE ur.user_id = $1
          
          UNION
          
          -- Group roles
          SELECT gr.role_id 
          FROM user_groups ug 
          JOIN group_roles gr ON ug.group_id = gr.group_id 
          WHERE ug.user_id = $1
        )
        ORDER BY r.name
      `, [userId, tenantId])
      
      return result.rows
    } catch (error) {
      console.error('Error getting user roles:', error)
      return []
    }
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(userId, roleId, assignedBy) {
    try {
      const result = await query(`
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, role_id) DO NOTHING
        RETURNING *
      `, [userId, roleId, assignedBy])
      
      return result.rows[0] || null
    } catch (error) {
      console.error('Error assigning role to user:', error)
      throw error
    }
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(userId, roleId) {
    try {
      const result = await query(`
        DELETE FROM user_roles 
        WHERE user_id = $1 AND role_id = $2
        RETURNING *
      `, [userId, roleId])
      
      return result.rowCount > 0
    } catch (error) {
      console.error('Error removing role from user:', error)
      throw error
    }
  }

  /**
   * Create a new role
   */
  static async createRole(roleData, tenantId, createdBy) {
    try {
      const { name, displayName, description, permissions = [] } = roleData
      
      // Create role
      const roleResult = await query(`
        INSERT INTO roles (name, display_name, description, tenant_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [name, displayName, description, tenantId])
      
      const role = roleResult.rows[0]
      
      // Assign permissions to role
      if (permissions.length > 0) {
        const permissionValues = permissions.map((_, index) => 
          `($1, $${index + 2})`
        ).join(', ')
        
        await query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${permissionValues}
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `, [role.id, ...permissions])
      }
      
      return role
    } catch (error) {
      console.error('Error creating role:', error)
      throw error
    }
  }

  /**
   * Get all roles for a tenant
   */
  static async getRoles(tenantId) {
    try {
      const result = await query(`
        SELECT r.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', p.id,
                     'name', p.name,
                     'display_name', p.display_name,
                     'resource', p.resource,
                     'action', p.action
                   )
                 ) FILTER (WHERE p.id IS NOT NULL), 
                 '[]'
               ) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.tenant_id = $1
        GROUP BY r.id, r.name, r.display_name, r.description, r.tenant_id, r.is_system_role, r.created_at, r.updated_at
        ORDER BY r.name
      `, [tenantId])
      
      return result.rows
    } catch (error) {
      console.error('Error getting roles:', error)
      return []
    }
  }

  /**
   * Get all permissions
   */
  static async getPermissions() {
    try {
      const result = await query(`
        SELECT * FROM permissions 
        ORDER BY resource, action, name
      `)
      
      return result.rows
    } catch (error) {
      console.error('Error getting permissions:', error)
      return []
    }
  }

  /**
   * Create a new group
   */
  static async createGroup(groupData, tenantId, createdBy) {
    try {
      const { name, description } = groupData
      
      const result = await query(`
        INSERT INTO groups (name, description, tenant_id, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [name, description, tenantId, createdBy])
      
      return result.rows[0]
    } catch (error) {
      console.error('Error creating group:', error)
      throw error
    }
  }

  /**
   * Get all groups for a tenant
   */
  static async getGroups(tenantId) {
    try {
      const result = await query(`
        SELECT g.*,
               u.email as created_by_email,
               COALESCE(
                 json_agg(
                   DISTINCT jsonb_build_object(
                     'id', gu.id,
                     'email', gu.email,
                     'name', gu.name
                   )
                 ) FILTER (WHERE gu.id IS NOT NULL), 
                 '[]'
               ) as users,
               COALESCE(
                 json_agg(
                   DISTINCT jsonb_build_object(
                     'id', r.id,
                     'name', r.name,
                     'display_name', r.display_name
                   )
                 ) FILTER (WHERE r.id IS NOT NULL), 
                 '[]'
               ) as roles
        FROM groups g
        LEFT JOIN users u ON g.created_by = u.id
        LEFT JOIN user_groups ug ON g.id = ug.group_id
        LEFT JOIN users gu ON ug.user_id = gu.id
        LEFT JOIN group_roles gr ON g.id = gr.group_id
        LEFT JOIN roles r ON gr.role_id = r.id
        WHERE g.tenant_id = $1
        GROUP BY g.id, g.name, g.description, g.display_name, g.tenant_id, g.created_by, g.created_at, g.updated_at, u.email
        ORDER BY g.name
      `, [tenantId])
      
      return result.rows
    } catch (error) {
      console.error('Error getting groups:', error)
      return []
    }
  }

  /**
   * Add user to group
   */
  static async addUserToGroup(userId, groupId, addedBy) {
    try {
      const result = await query(`
        INSERT INTO user_groups (user_id, group_id, added_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, group_id) DO NOTHING
        RETURNING *
      `, [userId, groupId, addedBy])
      
      return result.rows[0] || null
    } catch (error) {
      console.error('Error adding user to group:', error)
      throw error
    }
  }

  /**
   * Delete a role
   */
  static async deleteRole(roleId, tenantId) {
    try {
      // Check if it's a system role
      const roleCheck = await query(`
        SELECT is_system_role FROM roles 
        WHERE id = $1 AND tenant_id = $2
      `, [roleId, tenantId])
      
      if (roleCheck.rows.length === 0) {
        return false
      }
      
      if (roleCheck.rows[0].is_system_role) {
        throw new Error('System roles cannot be deleted')
      }
      
      // Delete role (cascading deletes will handle role_permissions, user_roles, group_roles)
      const result = await query(`
        DELETE FROM roles 
        WHERE id = $1 AND tenant_id = $2 AND is_system_role = false
        RETURNING *
      `, [roleId, tenantId])
      
      return result.rowCount > 0
    } catch (error) {
      console.error('Error deleting role:', error)
      throw error
    }
  }

  /**
   * Remove user from group
   */
  static async removeUserFromGroup(userId, groupId) {
    try {
      const result = await query(`
        DELETE FROM user_groups 
        WHERE user_id = $1 AND group_id = $2
        RETURNING *
      `, [userId, groupId])
      
      return result.rowCount > 0
    } catch (error) {
      console.error('Error removing user from group:', error)
      throw error
    }
  }

  /**
   * Initialize RBAC system for a new tenant
   * Creates default roles and assigns permissions
   */
  static async initializeTenantRBAC(tenantId) {
    try {
      console.log(`Initializing RBAC for tenant ${tenantId}`)
      
      // Create default roles for the new tenant
      const defaultRoles = [
        {
          name: 'super_admin',
          displayName: 'Super Administrator',
          description: 'Full system access with all permissions',
          isSystemRole: true
        },
        {
          name: 'admin',
          displayName: 'Administrator',
          description: 'Administrative access with user and object management',
          isSystemRole: true
        },
        {
          name: 'manager',
          displayName: 'Manager',
          description: 'Management access with team and object oversight',
          isSystemRole: true
        },
        {
          name: 'operator',
          displayName: 'Operator',
          description: 'Operational access for object management',
          isSystemRole: true
        },
        {
          name: 'viewer',
          displayName: 'Viewer',
          description: 'Read-only access to objects and data',
          isSystemRole: true
        },
        {
          name: 'user',
          displayName: 'Standard User',
          description: 'Basic user access for own objects',
          isSystemRole: true
        }
      ]

      const createdRoles = {}

      // Create each role
      for (const roleData of defaultRoles) {
        const result = await query(`
          INSERT INTO roles (name, display_name, description, tenant_id, is_system_role)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [roleData.name, roleData.displayName, roleData.description, tenantId, roleData.isSystemRole])
        
        createdRoles[roleData.name] = result.rows[0]
        console.log(`Created role: ${roleData.name} for tenant ${tenantId}`)
      }

      // Get all permissions
      const permissionsResult = await query('SELECT * FROM permissions')
      const permissions = permissionsResult.rows

      // Assign permissions to roles
      const rolePermissions = {
        super_admin: permissions, // All permissions
        admin: permissions.filter(p => p.name !== 'system.admin'), // All except system admin
        manager: permissions.filter(p => 
          ['objects', 'users', 'groups', 'types'].includes(p.resource) && 
          ['create', 'read', 'update', 'delete'].includes(p.action)
        ),
        operator: permissions.filter(p => 
          ['objects', 'types', 'icons'].includes(p.resource) && 
          ['create', 'read', 'update', 'delete'].includes(p.action)
        ),
        viewer: permissions.filter(p => p.action === 'read'),
        user: permissions.filter(p => 
          ['objects.create', 'objects.read', 'objects.update', 'objects.delete', 'types.read', 'icons.read'].includes(p.name)
        )
      }

      // Insert role permissions
      for (const [roleName, rolePerms] of Object.entries(rolePermissions)) {
        const role = createdRoles[roleName]
        if (role && rolePerms.length > 0) {
          const values = rolePerms.map((_, index) => `($1, $${index + 2})`).join(', ')
          const params = [role.id, ...rolePerms.map(p => p.id)]
          
          await query(`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES ${values}
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `, params)
          
          console.log(`Assigned ${rolePerms.length} permissions to ${roleName} for tenant ${tenantId}`)
        }
      }

      console.log(`RBAC initialization completed for tenant ${tenantId}`)
      return createdRoles
    } catch (error) {
      console.error('Error initializing tenant RBAC:', error)
      throw error
    }
  }
}
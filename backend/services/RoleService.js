import { query } from '../database.js'

export class RoleService {
  /**
   * Get user's roles
   */
  static async getUserRoles(userId, tenantId) {
    try {
      const result = await query(`
        SELECT DISTINCT r.id, r.name, r.display_name, r.description, r.is_system
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
        INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, role_id) DO NOTHING
        RETURNING *
      `, [userId, roleId, assignedBy])
      
      return result.rows.length > 0 ? result.rows[0] : null
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
      
      // Handle both rowCount (for tests) and rows (for actual DB)
      if (result.rowCount !== undefined) {
        return result.rowCount > 0 ? (result.rows && result.rows[0]) || true : null
      }
      return result && result.rows && result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      console.error('Error removing role from user:', error)
      throw error
    }
  }

  /**
   * Create a new role
   */
  static async createRole(roleData, tenantId, createdBy, isSystem = false) {
    try {
      const { name, displayName, description, permissions = [] } = roleData
      
      // Create the role
      const roleResult = await query(`
        INSERT INTO roles (name, display_name, description, tenant_id, created_by, is_system)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [name, displayName, description, tenantId, createdBy, isSystem])
      
      const role = roleResult.rows[0]
      
      // Assign permissions to the role
      if (permissions.length > 0) {
        const values = permissions.map((_, index) => `($1, $${index + 2})`).join(', ')
        await query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${values}
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
        SELECT 
          r.id, r.name, r.display_name, r.description, r.is_system, r.created_at,
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
            '[]'::json
          ) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.tenant_id = $1
        GROUP BY r.id, r.name, r.display_name, r.description, r.is_system, r.created_at
        ORDER BY r.name
      `, [tenantId])
      
      return result.rows
    } catch (error) {
      console.error('Error getting roles:', error)
      return []
    }
  }

  /**
   * Delete a role
   */
  static async deleteRole(roleId, tenantId) {
    try {
      // Check if it's a system role
      const roleCheck = await query(`
        SELECT is_system_role FROM roles WHERE id = $1 AND tenant_id = $2
      `, [roleId, tenantId])
      
      if (roleCheck.rows.length === 0) {
        return false
      }
      
      if (roleCheck.rows[0].is_system_role) {
        throw new Error('System roles cannot be deleted')
      }
      
      // Delete the role (CASCADE will handle role_permissions and user_roles)
      const result = await query(`
        DELETE FROM roles WHERE id = $1 AND tenant_id = $2 AND is_system_role = false
        RETURNING *
      `, [roleId, tenantId])
      
      return result.rowCount > 0
    } catch (error) {
      console.error('Error deleting role:', error)
      throw error
    }
  }
}
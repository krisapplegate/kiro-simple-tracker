import { query } from '../database.js'

export class PermissionService {
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
          JOIN group_roles gr ON ug.group_id = gr.group_id 
          JOIN role_permissions rp ON gr.role_id = rp.role_id 
          JOIN roles r ON gr.role_id = r.id
          WHERE ug.user_id = $1 AND r.tenant_id = $2
        )
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

      // Check specific action permissions
      const actionPermission = `objects.${action}`
      const hasActionPermission = await this.hasPermission(userId, tenantId, actionPermission)
      
      if (!hasActionPermission) {
        return false
      }

      // User has the action permission, now check if they own the object
      const objectResult = await query(`
        SELECT created_by FROM tracked_objects 
        WHERE id = $1 AND tenant_id = $2
      `, [objectId, tenantId])

      if (objectResult.rows.length === 0) {
        return false // Object not found
      }

      // Check if user owns the object
      return objectResult.rows[0].created_by === userId
    } catch (error) {
      console.error('Error checking object access:', error)
      return false
    }
  }

  /**
   * Get all permissions
   */
  static async getPermissions() {
    try {
      const result = await query(`
        SELECT id, name, display_name, description, resource, action
        FROM permissions
        ORDER BY resource, action
      `)
      
      return result.rows
    } catch (error) {
      console.error('Error getting permissions:', error)
      return []
    }
  }
}
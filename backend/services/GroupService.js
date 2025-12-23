import { query } from '../database.js'

export class GroupService {
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
        SELECT 
          g.id, g.name, g.description, g.created_at,
          COUNT(DISTINCT ug.user_id) as member_count,
          COALESCE(
            json_agg(
              DISTINCT json_build_object(
                'id', u.id,
                'email', u.email,
                'first_name', u.first_name,
                'last_name', u.last_name
              )
            ) FILTER (WHERE u.id IS NOT NULL),
            '[]'::json
          ) as members,
          COALESCE(
            json_agg(
              DISTINCT json_build_object(
                'id', r.id,
                'name', r.name,
                'display_name', r.display_name
              )
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'::json
          ) as roles
        FROM groups g
        LEFT JOIN user_groups ug ON g.id = ug.group_id
        LEFT JOIN users u ON ug.user_id = u.id
        LEFT JOIN group_roles gr ON g.id = gr.group_id
        LEFT JOIN roles r ON gr.role_id = r.id
        WHERE g.tenant_id = $1
        GROUP BY g.id, g.name, g.description, g.created_at
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
        INSERT INTO user_groups (user_id, group_id, added_by, added_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, group_id) DO NOTHING
        RETURNING *
      `, [userId, groupId, addedBy])
      
      return result.rows[0]
    } catch (error) {
      console.error('Error adding user to group:', error)
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
      
      // Handle both rowCount (for tests) and rows (for actual DB)
      if (result.rowCount !== undefined) {
        return result.rowCount > 0 ? (result.rows && result.rows[0]) || true : null
      }
      return result && result.rows && result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      console.error('Error removing user from group:', error)
      throw error
    }
  }

  /**
   * Assign role to group
   */
  static async assignRoleToGroup(groupId, roleId, assignedBy) {
    try {
      const result = await query(`
        INSERT INTO group_roles (group_id, role_id, assigned_by, assigned_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (group_id, role_id) DO NOTHING
        RETURNING *
      `, [groupId, roleId, assignedBy])
      
      return result.rows[0]
    } catch (error) {
      console.error('Error assigning role to group:', error)
      throw error
    }
  }

  /**
   * Remove role from group
   */
  static async removeRoleFromGroup(groupId, roleId) {
    try {
      const result = await query(`
        DELETE FROM group_roles 
        WHERE group_id = $1 AND role_id = $2
        RETURNING *
      `, [groupId, roleId])
      
      return result.rows[0]
    } catch (error) {
      console.error('Error removing role from group:', error)
      throw error
    }
  }

  /**
   * Delete a group
   */
  static async deleteGroup(groupId, tenantId) {
    try {
      const result = await query(`
        DELETE FROM groups 
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, [groupId, tenantId])
      
      return result.rows[0]
    } catch (error) {
      console.error('Error deleting group:', error)
      throw error
    }
  }
}
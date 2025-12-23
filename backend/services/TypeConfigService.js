import { query } from '../database.js'

export class TypeConfigService {
  /**
   * Get all type configurations for a tenant
   */
  static async getTypeConfigs(tenantId) {
    try {
      const result = await query(
        `SELECT type_name, emoji, color 
         FROM object_type_configs 
         WHERE tenant_id = $1 
         ORDER BY type_name ASC`,
        [tenantId]
      )
      
      const configs = result.rows.reduce((acc, row) => {
        acc[row.type_name] = {
          emoji: row.emoji,
          color: row.color
        }
        return acc
      }, {})
      
      return configs
    } catch (error) {
      console.error('Error getting type configs:', error)
      throw error
    }
  }

  /**
   * Create or update a type configuration
   */
  static async createTypeConfig(typeData, tenantId) {
    try {
      const { typeName, emoji, color } = typeData

      if (!typeName || !emoji) {
        throw new Error('Type name and emoji are required')
      }

      // Validate emoji (basic check for emoji characters)
      const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
      if (!emojiRegex.test(emoji)) {
        throw new Error('Invalid emoji format')
      }

      const result = await query(
        `INSERT INTO object_type_configs (type_name, emoji, color, tenant_id) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (type_name, tenant_id) 
         DO UPDATE SET emoji = $2, color = $3, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [typeName.toLowerCase(), emoji, color || '#6b7280', tenantId]
      )

      return {
        typeName: result.rows[0].type_name,
        emoji: result.rows[0].emoji,
        color: result.rows[0].color
      }
    } catch (error) {
      console.error('Error creating/updating type config:', error)
      throw error
    }
  }

  /**
   * Delete a type configuration
   */
  static async deleteTypeConfig(typeName, tenantId) {
    try {
      const result = await query(
        `DELETE FROM object_type_configs 
         WHERE type_name = $1 AND tenant_id = $2`,
        [typeName.toLowerCase(), tenantId]
      )

      if (result.rowCount === 0) {
        throw new Error('Object type config not found')
      }

      return true
    } catch (error) {
      console.error('Error deleting type config:', error)
      throw error
    }
  }
}
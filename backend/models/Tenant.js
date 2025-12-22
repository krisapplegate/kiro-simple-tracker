import { query } from '../database.js'

export class Tenant {
  static async findAll() {
    const result = await query(
      `SELECT id, name, created_at, updated_at 
       FROM tenants 
       ORDER BY name ASC`
    )
    
    return result.rows
  }

  static async findById(id) {
    const result = await query(
      `SELECT id, name, created_at, updated_at 
       FROM tenants 
       WHERE id = $1`,
      [id]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0]
  }

  static async create(tenantData) {
    const { name } = tenantData
    
    const result = await query(
      `INSERT INTO tenants (name) 
       VALUES ($1) 
       RETURNING id, name, created_at, updated_at`,
      [name]
    )
    
    return result.rows[0]
  }

  static async update(id, tenantData) {
    const { name } = tenantData
    
    const result = await query(
      `UPDATE tenants 
       SET name = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, name, created_at, updated_at`,
      [id, name]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0]
  }

  static async delete(id) {
    const result = await query(
      `DELETE FROM tenants 
       WHERE id = $1 
       RETURNING id`,
      [id]
    )
    
    return result.rowCount > 0
  }

  // Get tenant statistics
  static async getStats(tenantId) {
    const result = await query(
      `SELECT 
         (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as user_count,
         (SELECT COUNT(*) FROM objects WHERE tenant_id = $1) as object_count,
         (SELECT COUNT(DISTINCT type) FROM objects WHERE tenant_id = $1) as object_type_count,
         (SELECT COUNT(*) FROM location_history WHERE tenant_id = $1) as location_history_count`,
      [tenantId]
    )
    
    return result.rows[0]
  }
}
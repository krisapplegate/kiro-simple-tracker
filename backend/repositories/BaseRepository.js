import { query } from '../database.js'

export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName
  }

  async findById(id, tenantId = null) {
    const whereClause = tenantId ? 'id = $1 AND tenant_id = $2' : 'id = $1'
    const params = tenantId ? [id, tenantId] : [id]
    
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
      params
    )
    
    return result.rows[0] || null
  }

  async findByTenant(tenantId, conditions = {}) {
    let whereClause = 'tenant_id = $1'
    let params = [tenantId]
    let paramIndex = 2

    // Add additional conditions
    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        whereClause += ` AND ${key} = $${paramIndex}`
        params.push(value)
        paramIndex++
      }
    })

    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause} ORDER BY created_at DESC`,
      params
    )
    
    return result.rows
  }

  async create(data) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')
    
    const result = await query(
      `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    )
    
    return result.rows[0]
  }

  async update(id, data, tenantId = null) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ')
    
    const whereClause = tenantId ? 'id = $1 AND tenant_id = $' + (keys.length + 2) : 'id = $1'
    const params = tenantId ? [id, ...values, tenantId] : [id, ...values]
    
    const result = await query(
      `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause} RETURNING *`,
      params
    )
    
    return result.rows[0] || null
  }

  async delete(id, tenantId = null) {
    const whereClause = tenantId ? 'id = $1 AND tenant_id = $2' : 'id = $1'
    const params = tenantId ? [id, tenantId] : [id]
    
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE ${whereClause} RETURNING *`,
      params
    )
    
    return result.rows[0] || null
  }

  async count(tenantId = null) {
    const whereClause = tenantId ? 'WHERE tenant_id = $1' : ''
    const params = tenantId ? [tenantId] : []
    
    const result = await query(
      `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`,
      params
    )
    
    return parseInt(result.rows[0].count)
  }
}
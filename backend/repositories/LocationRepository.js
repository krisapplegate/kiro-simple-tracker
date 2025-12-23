import { BaseRepository } from './BaseRepository.js'
import { query } from '../database.js'

export class LocationRepository extends BaseRepository {
  constructor() {
    super('location_history')
  }

  async findByObjectId(objectId, tenantId, limit = 100) {
    const result = await query(`
      SELECT * FROM ${this.tableName} 
      WHERE object_id = $1 AND tenant_id = $2 
      ORDER BY timestamp DESC 
      LIMIT $3
    `, [objectId, tenantId, limit])

    return result.rows
  }

  async getLatestLocation(objectId, tenantId) {
    const result = await query(`
      SELECT * FROM ${this.tableName} 
      WHERE object_id = $1 AND tenant_id = $2 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [objectId, tenantId])

    return result.rows[0] || null
  }

  async createLocationEntry(data) {
    return this.create({
      ...data,
      timestamp: new Date()
    })
  }

  async deleteByObjectId(objectId, tenantId) {
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE object_id = $1 AND tenant_id = $2`,
      [objectId, tenantId]
    )
    return result.rowCount
  }
}
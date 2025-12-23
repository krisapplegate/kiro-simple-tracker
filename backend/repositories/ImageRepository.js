import { BaseRepository } from './BaseRepository.js'
import { query } from '../database.js'

export class ImageRepository extends BaseRepository {
  constructor() {
    super('images')
  }

  async findByObjectId(objectId, tenantId) {
    const result = await query(`
      SELECT * FROM ${this.tableName} 
      WHERE object_id = $1 AND tenant_id = $2 
      ORDER BY uploaded_at DESC
    `, [objectId, tenantId])

    return result.rows
  }

  async findRecent(tenantId, limit = 20) {
    const result = await query(`
      SELECT 
        i.*,
        o.name as object_name,
        o.type as object_type
      FROM ${this.tableName} i
      JOIN objects o ON i.object_id = o.id
      WHERE i.tenant_id = $1
      ORDER BY i.uploaded_at DESC
      LIMIT $2
    `, [tenantId, limit])

    return result.rows
  }

  async deleteByObjectId(objectId, tenantId) {
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE object_id = $1 AND tenant_id = $2 RETURNING *`,
      [objectId, tenantId]
    )
    return result.rows
  }

  async findByObjectName(objectName, tenantId) {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE object_name = $1 AND tenant_id = $2`,
      [objectName, tenantId]
    )
    return result.rows[0] || null
  }
}
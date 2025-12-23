import { BaseRepository } from './BaseRepository.js'
import { query } from '../database.js'

export class ObjectRepository extends BaseRepository {
  constructor() {
    super('objects')
  }

  async findByTenantWithFilters(tenantId, { timeRange, types, tags } = {}) {
    let whereConditions = ['tenant_id = $1']
    let params = [tenantId]
    let paramIndex = 2

    if (types) {
      const typeArray = types.split(',').map(t => t.trim())
      whereConditions.push(`type = ANY($${paramIndex})`)
      params.push(typeArray)
      paramIndex++
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim())
      whereConditions.push(`tags && $${paramIndex}`)
      params.push(tagArray)
      paramIndex++
    }

    if (timeRange) {
      const hours = parseInt(timeRange)
      if (!isNaN(hours)) {
        whereConditions.push(`created_at >= NOW() - INTERVAL '${hours} hours'`)
      }
    }

    const result = await query(
      `SELECT * FROM ${this.tableName} 
       WHERE ${whereConditions.join(' AND ')} 
       ORDER BY created_at DESC`,
      params
    )

    return result.rows
  }

  async findWithPaths(tenantId) {
    const result = await query(`
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'lat', lh.lat,
              'lng', lh.lng,
              'timestamp', lh.timestamp
            ) ORDER BY lh.timestamp
          ) FILTER (WHERE lh.id IS NOT NULL),
          '[]'::json
        ) as path
      FROM objects o
      LEFT JOIN location_history lh ON o.id = lh.object_id
      WHERE o.tenant_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [tenantId])

    return result.rows
  }

  async getTypes(tenantId) {
    const result = await query(
      'SELECT DISTINCT type FROM objects WHERE tenant_id = $1 ORDER BY type',
      [tenantId]
    )
    return result.rows.map(row => row.type)
  }

  async getTags(tenantId) {
    const result = await query(`
      SELECT DISTINCT unnest(tags) as tag 
      FROM objects 
      WHERE tenant_id = $1 AND tags IS NOT NULL 
      ORDER BY tag
    `, [tenantId])
    return result.rows.map(row => row.tag)
  }

  async getImageCounts(tenantId) {
    const result = await query(`
      SELECT 
        o.id,
        o.name,
        COUNT(i.id) as image_count
      FROM objects o
      LEFT JOIN images i ON o.id = i.object_id
      WHERE o.tenant_id = $1
      GROUP BY o.id, o.name
      ORDER BY o.name
    `, [tenantId])

    return result.rows
  }
}
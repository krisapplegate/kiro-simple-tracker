import { query } from '../database.js'

export class TrackedObject {
  static async findByTenant(tenantId, filters = {}) {
    let whereClause = 'WHERE tenant_id = $1'
    let params = [tenantId]
    let paramCount = 1

    // Apply type filter
    if (filters.types && filters.types.length > 0) {
      paramCount++
      whereClause += ` AND type = ANY($${paramCount})`
      params.push(filters.types)
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      paramCount++
      whereClause += ` AND tags && $${paramCount}`
      params.push(filters.tags)
    }

    // Apply time range filter
    if (filters.timeRange) {
      const hours = this.parseTimeRange(filters.timeRange)
      if (hours) {
        paramCount++
        whereClause += ` AND updated_at >= NOW() - INTERVAL '${hours} hours'`
      }
    }

    const result = await query(
      `SELECT id, name, type, lat, lng, status, description, tags, 
              custom_fields, tenant_id, created_by, created_at, updated_at, last_update
       FROM objects 
       ${whereClause}
       ORDER BY updated_at DESC`,
      params
    )

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      status: row.status,
      description: row.description,
      tags: row.tags || [],
      customFields: row.custom_fields || {},
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUpdate: row.last_update
    }))
  }

  static async findById(id, tenantId) {
    const result = await query(
      `SELECT id, name, type, lat, lng, status, description, tags, 
              custom_fields, tenant_id, created_by, created_at, updated_at, last_update
       FROM objects 
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      status: row.status,
      description: row.description,
      tags: row.tags || [],
      customFields: row.custom_fields || {},
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUpdate: row.last_update
    }
  }

  static async create(objectData) {
    const {
      name, type, lat, lng, description, tags, customFields, tenantId, createdBy
    } = objectData

    const result = await query(
      `INSERT INTO objects (name, type, lat, lng, description, tags, custom_fields, tenant_id, created_by, last_update) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
       RETURNING id, name, type, lat, lng, status, description, tags, 
                 custom_fields, tenant_id, created_by, created_at, updated_at, last_update`,
      [name, type, lat, lng, description || '', tags || [], JSON.stringify(customFields || {}), tenantId, createdBy]
    )

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      status: row.status,
      description: row.description,
      tags: row.tags || [],
      customFields: row.custom_fields || {},
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUpdate: row.last_update
    }
  }

  static async updateLocation(id, lat, lng, tenantId) {
    const result = await query(
      `UPDATE objects 
       SET lat = $1, lng = $2, last_update = NOW(), updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, name, type, lat, lng, status, description, tags, 
                 custom_fields, tenant_id, created_by, created_at, updated_at, last_update`,
      [lat, lng, id, tenantId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      status: row.status,
      description: row.description,
      tags: row.tags || [],
      customFields: row.custom_fields || {},
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUpdate: row.last_update
    }
  }

  static async delete(id, tenantId, userId, userRole) {
    // First, check if the object exists and get its details
    const objectResult = await query(
      `SELECT id, name, created_by FROM objects WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    )

    if (objectResult.rows.length === 0) {
      return { success: false, error: 'Object not found' }
    }

    const object = objectResult.rows[0]

    // Check permissions: admin can delete any object, users can only delete their own
    if (userRole !== 'admin' && object.created_by !== userId) {
      return { success: false, error: 'Permission denied. You can only delete objects you created.' }
    }

    // Delete the object (location_history will be deleted automatically due to CASCADE)
    const deleteResult = await query(
      `DELETE FROM objects WHERE id = $1 AND tenant_id = $2 RETURNING name`,
      [id, tenantId]
    )

    if (deleteResult.rows.length > 0) {
      return { 
        success: true, 
        message: `Object "${deleteResult.rows[0].name}" deleted successfully` 
      }
    } else {
      return { success: false, error: 'Failed to delete object' }
    }
  }

  static parseTimeRange(timeRange) {
    const timeRangeMap = {
      '1h': 1,
      '6h': 6,
      '12h': 12,
      '24h': 24,
      '7d': 168, // 7 days * 24 hours
      '30d': 720 // 30 days * 24 hours
    }
    return timeRangeMap[timeRange] || null
  }
}
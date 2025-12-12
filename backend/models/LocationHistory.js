import { query } from '../database.js'

export class LocationHistory {
  static async findByObject(objectId, tenantId, limit = 100) {
    const result = await query(
      `SELECT id, object_id, lat, lng, address, timestamp, tenant_id
       FROM location_history 
       WHERE object_id = $1 AND tenant_id = $2
       ORDER BY timestamp DESC
       LIMIT $3`,
      [objectId, tenantId, limit]
    )

    return result.rows.map(row => ({
      id: row.id,
      objectId: row.object_id,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      address: row.address,
      timestamp: row.timestamp,
      tenantId: row.tenant_id
    }))
  }

  static async create(objectId, lat, lng, address, tenantId) {
    const result = await query(
      `INSERT INTO location_history (object_id, lat, lng, address, tenant_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, object_id, lat, lng, address, timestamp, tenant_id`,
      [objectId, lat, lng, address || 'Unknown', tenantId]
    )

    const row = result.rows[0]
    return {
      id: row.id,
      objectId: row.object_id,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      address: row.address,
      timestamp: row.timestamp,
      tenantId: row.tenant_id
    }
  }

  static async findRecent(tenantId, hours = 24, limit = 1000) {
    const result = await query(
      `SELECT lh.*, o.name as object_name, o.type as object_type
       FROM location_history lh
       JOIN objects o ON lh.object_id = o.id
       WHERE lh.tenant_id = $1 
         AND lh.timestamp >= NOW() - INTERVAL '${hours} hours'
       ORDER BY lh.timestamp DESC
       LIMIT $2`,
      [tenantId, limit]
    )

    return result.rows.map(row => ({
      id: row.id,
      objectId: row.object_id,
      objectName: row.object_name,
      objectType: row.object_type,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      address: row.address,
      timestamp: row.timestamp,
      tenantId: row.tenant_id
    }))
  }
}
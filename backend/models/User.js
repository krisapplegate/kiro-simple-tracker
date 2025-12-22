import { query } from '../database.js'
import bcrypt from 'bcryptjs'

export class User {
  static async findByEmail(email) {
    const result = await query(
      `SELECT u.*, t.name as tenant_name 
       FROM users u 
       JOIN tenants t ON u.tenant_id = t.id 
       WHERE u.email = $1`,
      [email]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    const user = result.rows[0]
    return {
      id: user.id,
      email: user.email,
      password: user.password_hash,
      role: user.role,
      tenant: {
        id: user.tenant_id,
        name: user.tenant_name
      }
    }
  }

  // New method: Get all tenants a user has access to
  static async getUserTenants(userId) {
    try {
      // First get the user's email from their ID
      const userResult = await query('SELECT email FROM users WHERE id = $1', [userId])
      if (userResult.rows.length === 0) {
        return []
      }
      
      const userEmail = userResult.rows[0].email
      
      // Get tenants where user has access by email (since users can have different IDs per tenant)
      const result = await query(
        `SELECT DISTINCT t.id, t.name, t.created_at, u.role as user_role
         FROM tenants t
         JOIN users u ON t.id = u.tenant_id
         WHERE u.email = $1
         ORDER BY t.name ASC`,
        [userEmail]
      )
      
      // Add empty roles array for now
      return result.rows.map(row => ({
        ...row,
        roles: []
      }))
    } catch (error) {
      console.log('Error getting user tenants, falling back to simple query:', error.message)
      // Fallback: just get the user's primary tenant
      const result = await query(
        `SELECT t.id, t.name, t.created_at, u.role as user_role, '[]'::json as roles
         FROM tenants t
         JOIN users u ON t.id = u.tenant_id
         WHERE u.id = $1`,
        [userId]
      )
      
      return result.rows
    }
  }

  // New method: Get user info for a specific tenant
  static async findByIdAndTenant(userId, tenantId) {
    try {
      const result = await query(
        `SELECT u.id, u.email, u.role, u.created_at,
                t.id as tenant_id, t.name as tenant_name,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', r.id,
                      'name', r.name,
                      'display_name', r.display_name
                    )
                  ) FILTER (WHERE r.id IS NOT NULL), 
                  '[]'
                ) as roles
         FROM users u
         JOIN tenants t ON u.tenant_id = $2
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id AND r.tenant_id = $2
         WHERE u.id = $1 AND u.tenant_id = $2
         GROUP BY u.id, u.email, u.role, u.created_at, t.id, t.name`,
        [userId, tenantId]
      )
      
      if (result.rows.length === 0) {
        return null
      }
      
      const user = result.rows[0]
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: {
          id: user.tenant_id,
          name: user.tenant_name
        },
        roles: user.roles,
        created_at: user.created_at
      }
    } catch (error) {
      console.log('Error getting user by tenant, falling back:', error.message)
      return null
    }
  }

  static async findById(id) {
    const result = await query(
      `SELECT u.*, t.name as tenant_name 
       FROM users u 
       JOIN tenants t ON u.tenant_id = t.id 
       WHERE u.id = $1`,
      [id]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    const user = result.rows[0]
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant: {
        id: user.tenant_id,
        name: user.tenant_name
      }
    }
  }

  static async create(userData) {
    const { email, password, role = 'user', tenantId } = userData
    const passwordHash = await bcrypt.hash(password, 10)
    
    const result = await query(
      `INSERT INTO users (email, password_hash, role, tenant_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, role, tenant_id, created_at`,
      [email, passwordHash, role, tenantId]
    )
    
    return result.rows[0]
  }

  static async findByTenant(tenantId) {
    try {
      // First, try the query with RBAC roles
      const result = await query(
        `SELECT u.id, u.email, u.role, u.created_at,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', r.id,
                      'name', r.name,
                      'display_name', r.display_name
                    )
                  ) FILTER (WHERE r.id IS NOT NULL), 
                  '[]'
                ) as roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.tenant_id = $1
         GROUP BY u.id, u.email, u.role, u.created_at
         ORDER BY u.created_at DESC`,
        [tenantId]
      )
      
      return result.rows
    } catch (error) {
      // If RBAC tables don't exist yet, fall back to simple query
      console.log('RBAC tables not available, using simple user query:', error.message)
      const result = await query(
        `SELECT u.id, u.email, u.role, u.created_at,
                '[]'::json as roles
         FROM users u
         WHERE u.tenant_id = $1
         ORDER BY u.created_at DESC`,
        [tenantId]
      )
      
      return result.rows
    }
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  }
}
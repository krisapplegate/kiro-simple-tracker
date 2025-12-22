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
    const { email, password, name, role = 'user', tenantId } = userData
    const passwordHash = await bcrypt.hash(password, 10)
    
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, tenant_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, role, tenant_id, created_at`,
      [email, passwordHash, name, role, tenantId]
    )
    
    return result.rows[0]
  }

  static async findByTenant(tenantId) {
    try {
      // First, try the query with RBAC roles
      const result = await query(
        `SELECT u.id, u.email, u.name, u.role, u.created_at,
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
         GROUP BY u.id, u.email, u.name, u.role, u.created_at
         ORDER BY u.created_at DESC`,
        [tenantId]
      )
      
      return result.rows
    } catch (error) {
      // If RBAC tables don't exist yet, fall back to simple query
      console.log('RBAC tables not available, using simple user query:', error.message)
      const result = await query(
        `SELECT u.id, u.email, u.name, u.role, u.created_at,
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
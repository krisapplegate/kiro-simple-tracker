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

  static async create(email, password, role = 'user', tenantId) {
    const passwordHash = await bcrypt.hash(password, 10)
    
    const result = await query(
      `INSERT INTO users (email, password_hash, role, tenant_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, role, tenant_id`,
      [email, passwordHash, role, tenantId]
    )
    
    return result.rows[0]
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  }
}
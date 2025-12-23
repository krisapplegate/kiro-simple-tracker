import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { query } from '../database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export class AuthController {
  static async healthCheck(req, res) {
    try {
      // Test database connection
      const result = await query('SELECT NOW() as timestamp')
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'connected'
      })
    } catch (error) {
      console.error('Health check failed:', error)
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message
      })
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' })
      }

      const user = await User.findByEmail(email)
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const isValidPassword = await User.verifyPassword(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          tenantId: user.tenant.id
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      )

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenant: user.tenant
        }
      })
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async validateToken(req, res) {
    try {
      const user = await User.findById(req.user.id)
      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }

      res.json({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenant.id
        },
        permissions: req.user.permissions || [],
        roles: req.user.roles || []
      })
    } catch (error) {
      console.error('Token validation error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
}
import { User } from '../models/User.js'
import { RBACService } from '../services/RBACService.js'

export class UserController {
  static async getUsers(req, res) {
    try {
      const users = await User.findByTenant(req.user.effectiveTenantId)
      res.json(users)
    } catch (error) {
      console.error('Error fetching users:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async createUser(req, res) {
    try {
      const { email, password, name, roleId } = req.body
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' })
      }
      
      // Check if user already exists in this tenant
      const existingUser = await User.findByEmailAndTenant(email, req.user.effectiveTenantId)
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists in this workspace' })
      }
      
      // Create user
      const user = await User.create({
        email,
        password,
        name,
        tenant_id: req.user.effectiveTenantId,
        created_by: req.user.effectiveUserId
      })
      
      // Assign role if provided
      if (roleId) {
        await RBACService.assignRoleToUser(user.id, roleId, req.user.effectiveTenantId, req.user.effectiveUserId)
      }
      
      // Return user without password
      const { password_hash, ...userResponse } = user
      res.status(201).json(userResponse)
    } catch (error) {
      console.error('Error creating user:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
}
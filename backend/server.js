import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import dotenv from 'dotenv'
import { User } from './models/User.js'
import { TrackedObject } from './models/TrackedObject.js'
import { LocationHistory } from './models/LocationHistory.js'
import { query } from './database.js'
import { RBACService } from './services/RBACService.js'
import { 
  requirePermission, 
  requireObjectAccess, 
  requireUserManagement,
  attachPermissions 
} from './middleware/rbac.js'

dotenv.config()

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Middleware
app.use(cors())
app.use(express.json())

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Auth middleware with RBAC
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access token required' })
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }
    
    req.user = user
    
    // Attach permissions and roles to user
    try {
      req.user.permissions = await RBACService.getUserPermissions(user.id, user.tenantId)
      req.user.roles = await RBACService.getUserRoles(user.id, user.tenantId)
    } catch (error) {
      console.error('Error loading user permissions:', error)
      req.user.permissions = []
      req.user.roles = []
    }
    
    next()
  })
}

// Routes

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await query('SELECT 1')
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    })
  }
})

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findByEmail(email)
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const validPassword = await User.verifyPassword(password, user.password)
    if (!validPassword) {
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
})

app.get('/api/auth/validate', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      tenant: user.tenant,
      permissions: req.user.permissions || [],
      roles: req.user.roles || []
    })
  } catch (error) {
    console.error('Validate error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// RBAC Routes

// Get all roles for tenant
app.get('/api/rbac/roles', authenticateToken, requirePermission('roles.read'), async (req, res) => {
  try {
    const roles = await RBACService.getRoles(req.user.tenantId)
    res.json(roles)
  } catch (error) {
    console.error('Get roles error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create new role
app.post('/api/rbac/roles', authenticateToken, requirePermission('roles.create'), async (req, res) => {
  try {
    const role = await RBACService.createRole(req.body, req.user.tenantId, req.user.id)
    res.status(201).json(role)
  } catch (error) {
    console.error('Create role error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all permissions
app.get('/api/rbac/permissions', authenticateToken, requirePermission('roles.read'), async (req, res) => {
  try {
    const permissions = await RBACService.getPermissions()
    res.json(permissions)
  } catch (error) {
    console.error('Get permissions error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all groups for tenant
app.get('/api/rbac/groups', authenticateToken, requirePermission('groups.read'), async (req, res) => {
  try {
    const groups = await RBACService.getGroups(req.user.tenantId)
    res.json(groups)
  } catch (error) {
    console.error('Get groups error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create new group
app.post('/api/rbac/groups', authenticateToken, requirePermission('groups.create'), async (req, res) => {
  try {
    const group = await RBACService.createGroup(req.body, req.user.tenantId, req.user.id)
    res.status(201).json(group)
  } catch (error) {
    console.error('Create group error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Assign role to user
app.post('/api/rbac/users/:userId/roles', authenticateToken, requireUserManagement(), async (req, res) => {
  try {
    const { roleId } = req.body
    const userId = parseInt(req.params.userId)
    
    const assignment = await RBACService.assignRoleToUser(userId, roleId, req.user.id)
    res.json(assignment)
  } catch (error) {
    console.error('Assign role error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Remove role from user
app.delete('/api/rbac/users/:userId/roles/:roleId', authenticateToken, requireUserManagement(), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    const roleId = parseInt(req.params.roleId)
    
    const success = await RBACService.removeRoleFromUser(userId, roleId)
    if (success) {
      res.json({ message: 'Role removed successfully' })
    } else {
      res.status(404).json({ message: 'Role assignment not found' })
    }
  } catch (error) {
    console.error('Remove role error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Add user to group
app.post('/api/rbac/groups/:groupId/users', authenticateToken, requirePermission('groups.update'), async (req, res) => {
  try {
    const { userId } = req.body
    const groupId = parseInt(req.params.groupId)
    
    const assignment = await RBACService.addUserToGroup(userId, groupId, req.user.id)
    res.json(assignment)
  } catch (error) {
    console.error('Add user to group error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Remove user from group
app.delete('/api/rbac/groups/:groupId/users/:userId', authenticateToken, requirePermission('groups.update'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    const groupId = parseInt(req.params.groupId)
    
    const success = await RBACService.removeUserFromGroup(userId, groupId)
    if (success) {
      res.json({ message: 'User removed from group successfully' })
    } else {
      res.status(404).json({ message: 'User group assignment not found' })
    }
  } catch (error) {
    console.error('Remove user from group error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get user's permissions and roles
app.get('/api/rbac/users/:userId', authenticateToken, requireUserManagement(), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    const permissions = await RBACService.getUserPermissions(userId, req.user.tenantId)
    const roles = await RBACService.getUserRoles(userId, req.user.tenantId)
    
    res.json({ permissions, roles })
  } catch (error) {
    console.error('Get user RBAC info error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Object routes
app.get('/api/objects', authenticateToken, requirePermission('objects.read'), async (req, res) => {
  try {
    const { timeRange, types, tags } = req.query
    
    const filters = {}
    if (types) {
      filters.types = types.split(',')
    }
    if (tags) {
      filters.tags = tags.split(',')
    }
    if (timeRange) {
      filters.timeRange = timeRange
    }

    const objects = await TrackedObject.findByTenant(req.user.tenantId, filters)
    res.json(objects)
  } catch (error) {
    console.error('Get objects error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.post('/api/objects', authenticateToken, requirePermission('objects.create'), async (req, res) => {
  try {
    const { name, type, lat, lng, description, tags, customFields } = req.body

    if (!name || !type || lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const objectData = {
      name,
      type,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      description,
      tags,
      customFields,
      tenantId: req.user.tenantId,
      createdBy: req.user.id
    }

    const newObject = await TrackedObject.create(objectData)

    // Add initial location to history
    await LocationHistory.create(
      newObject.id,
      newObject.lat,
      newObject.lng,
      'Initial location',
      req.user.tenantId
    )

    // Broadcast to WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({
          type: 'object_created',
          data: newObject
        }))
      }
    })

    res.status(201).json(newObject)
  } catch (error) {
    console.error('Create object error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.delete('/api/objects/:id', authenticateToken, requireObjectAccess('delete'), async (req, res) => {
  try {
    const objectId = parseInt(req.params.id)
    
    if (isNaN(objectId)) {
      return res.status(400).json({ message: 'Invalid object ID' })
    }

    const result = await TrackedObject.delete(
      objectId, 
      req.user.tenantId, 
      req.user.id, 
      req.user.role
    )

    if (result.success) {
      // Broadcast deletion to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'object_deleted',
            data: { id: objectId }
          }))
        }
      })

      res.json({ message: result.message })
    } else {
      const statusCode = result.error.includes('Permission denied') ? 403 : 404
      res.status(statusCode).json({ message: result.error })
    }
  } catch (error) {
    console.error('Delete object error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.get('/api/objects/types', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT type, COUNT(*) as count 
       FROM objects 
       WHERE tenant_id = $1 
       GROUP BY type 
       ORDER BY count DESC, type ASC`,
      [req.user.tenantId]
    )
    
    const types = result.rows.map(row => ({
      name: row.type,
      count: parseInt(row.count)
    }))
    
    res.json(types)
  } catch (error) {
    console.error('Get object types error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.get('/api/objects/tags', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT UNNEST(tags) as tag, COUNT(*) as count 
       FROM objects 
       WHERE tenant_id = $1 AND tags IS NOT NULL AND array_length(tags, 1) > 0
       GROUP BY tag 
       ORDER BY count DESC, tag ASC 
       LIMIT 20`,
      [req.user.tenantId]
    )
    
    const tags = result.rows.map(row => ({
      name: row.tag,
      count: parseInt(row.count)
    }))
    
    res.json(tags)
  } catch (error) {
    console.error('Get object tags error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.get('/api/objects/:id/locations', authenticateToken, async (req, res) => {
  try {
    const objectId = parseInt(req.params.id)
    const history = await LocationHistory.findByObject(objectId, req.user.tenantId)
    res.json(history)
  } catch (error) {
    console.error('Get locations error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Object Type Configuration endpoints
app.get('/api/object-type-configs', authenticateToken, requirePermission('types.read'), async (req, res) => {
  try {
    const result = await query(
      `SELECT type_name, emoji, color 
       FROM object_type_configs 
       WHERE tenant_id = $1 
       ORDER BY type_name ASC`,
      [req.user.tenantId]
    )
    
    const configs = result.rows.reduce((acc, row) => {
      acc[row.type_name] = {
        emoji: row.emoji,
        color: row.color
      }
      return acc
    }, {})
    
    res.json(configs)
  } catch (error) {
    console.error('Get object type configs error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.post('/api/object-type-configs', authenticateToken, requirePermission('types.create'), async (req, res) => {
  try {
    const { typeName, emoji, color } = req.body

    if (!typeName || !emoji) {
      return res.status(400).json({ message: 'Type name and emoji are required' })
    }

    // Validate emoji (basic check for emoji characters)
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
    if (!emojiRegex.test(emoji)) {
      return res.status(400).json({ message: 'Invalid emoji format' })
    }

    const result = await query(
      `INSERT INTO object_type_configs (type_name, emoji, color, tenant_id) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (type_name, tenant_id) 
       DO UPDATE SET emoji = $2, color = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [typeName.toLowerCase(), emoji, color || '#6b7280', req.user.tenantId]
    )

    res.json({
      typeName: result.rows[0].type_name,
      emoji: result.rows[0].emoji,
      color: result.rows[0].color
    })
  } catch (error) {
    console.error('Create/update object type config error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

app.delete('/api/object-type-configs/:typeName', authenticateToken, requirePermission('types.delete'), async (req, res) => {
  try {
    const typeName = req.params.typeName.toLowerCase()
    
    const result = await query(
      `DELETE FROM object_type_configs 
       WHERE type_name = $1 AND tenant_id = $2`,
      [typeName, req.user.tenantId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Object type config not found' })
    }

    res.json({ message: 'Object type config deleted successfully' })
  } catch (error) {
    console.error('Delete object type config error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }))
          break
      }
    } catch (error) {
      // Silent error handling
    }
  })

  // Send initial connection confirmation
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'WebSocket connection established' 
  }))
})

// Simulate real-time location updates
setInterval(async () => {
  try {
    // Get all active objects from all tenants for simulation
    const result = await query('SELECT id, lat, lng, tenant_id FROM objects WHERE status = $1', ['active'])
    
    for (const obj of result.rows) {
      // 30% chance to update each object
      if (Math.random() > 0.7) {
        const latOffset = (Math.random() - 0.5) * 0.001
        const lngOffset = (Math.random() - 0.5) * 0.001
        
        const newLat = parseFloat(obj.lat) + latOffset
        const newLng = parseFloat(obj.lng) + lngOffset

        // Update object location in database
        const updatedObject = await TrackedObject.updateLocation(obj.id, newLat, newLng, obj.tenant_id)
        
        if (updatedObject) {
          // Add to location history
          await LocationHistory.create(
            obj.id,
            newLat,
            newLng,
            'Simulated update',
            obj.tenant_id
          )

          // Broadcast update to WebSocket clients
          wss.clients.forEach(client => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'location_update',
                data: updatedObject
              }))
            }
          })
        }
      }
    }
  } catch (error) {
    console.error('Location simulation error:', error)
  }
}, 10000) // Update every 10 seconds

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
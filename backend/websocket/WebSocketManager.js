import { WebSocketServer } from 'ws'

export class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocketServer({ server })
    this.clients = new Map() // Map to store client connections by tenant
    this.setupWebSocket()
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection')
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message)
          
          if (data.type === 'join_tenant') {
            ws.tenantId = data.tenantId
            
            // Add client to tenant group
            if (!this.clients.has(data.tenantId)) {
              this.clients.set(data.tenantId, new Set())
            }
            this.clients.get(data.tenantId).add(ws)
            
            console.log(`Client joined tenant ${data.tenantId}`)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      })
      
      ws.on('close', () => {
        // Remove client from tenant group
        if (ws.tenantId && this.clients.has(ws.tenantId)) {
          this.clients.get(ws.tenantId).delete(ws)
          
          // Clean up empty tenant groups
          if (this.clients.get(ws.tenantId).size === 0) {
            this.clients.delete(ws.tenantId)
          }
        }
        console.log('WebSocket connection closed')
      })
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
      })
    })
  }

  // Broadcast message to all clients in a specific tenant
  broadcastToTenant(tenantId, data) {
    if (this.clients.has(tenantId)) {
      const message = JSON.stringify(data)
      
      this.clients.get(tenantId).forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          try {
            client.send(message)
          } catch (error) {
            console.error('Error sending WebSocket message:', error)
          }
        }
      })
    }
  }

  // Broadcast object creation
  broadcastObjectCreated(tenantId, object) {
    this.broadcastToTenant(tenantId, {
      type: 'object_created',
      data: object
    })
  }

  // Broadcast object update
  broadcastObjectUpdated(tenantId, object) {
    this.broadcastToTenant(tenantId, {
      type: 'object_updated',
      data: object
    })
  }

  // Broadcast object deletion
  broadcastObjectDeleted(tenantId, objectId) {
    this.broadcastToTenant(tenantId, {
      type: 'object_deleted',
      data: { id: objectId }
    })
  }

  // Broadcast image upload
  broadcastImageUploaded(tenantId, imageData) {
    this.broadcastToTenant(tenantId, {
      type: 'image_uploaded',
      data: imageData
    })
  }

  // Get connection count for a tenant
  getTenantConnectionCount(tenantId) {
    return this.clients.has(tenantId) ? this.clients.get(tenantId).size : 0
  }

  // Get total connection count
  getTotalConnectionCount() {
    let total = 0
    this.clients.forEach(tenantClients => {
      total += tenantClients.size
    })
    return total
  }
}
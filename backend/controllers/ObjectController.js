import { objectService } from '../services/ObjectService.js'

export class ObjectController {
  static async getObjects(req, res) {
    try {
      const { timeRange, types, tags } = req.query
      const objects = await objectService.getObjects(req.user.effectiveTenantId, { timeRange, types, tags })
      res.json(objects)
    } catch (error) {
      console.error('Error fetching objects:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async createObject(req, res) {
    try {
      const object = await objectService.createObject(
        req.body,
        req.user.effectiveTenantId,
        req.user.effectiveUserId
      )
      
      // Broadcast object creation via WebSocket
      if (req.app.locals.wsManager) {
        req.app.locals.wsManager.broadcastObjectCreated(req.user.effectiveTenantId, object)
      }
      
      res.status(201).json(object)
    } catch (error) {
      console.error('Error creating object:', error)
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        return res.status(400).json({ message: error.message })
      }
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async deleteObject(req, res) {
    try {
      const objectId = parseInt(req.params.id)
      await objectService.deleteObject(objectId, req.user.effectiveTenantId)
      
      // Broadcast object deletion via WebSocket
      if (req.app.locals.wsManager) {
        req.app.locals.wsManager.broadcastObjectDeleted(req.user.effectiveTenantId, objectId)
      }
      
      res.json({ message: 'Object deleted successfully' })
    } catch (error) {
      console.error('Error deleting object:', error)
      if (error.message === 'Object not found') {
        return res.status(404).json({ message: error.message })
      }
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getObjectsWithPaths(req, res) {
    try {
      const objects = await objectService.getObjectsWithPaths(req.user.effectiveTenantId)
      res.json(objects)
    } catch (error) {
      console.error('Error fetching objects with paths:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getObjectTypes(req, res) {
    try {
      const types = await objectService.getObjectTypes(req.user.effectiveTenantId)
      res.json(types)
    } catch (error) {
      console.error('Error fetching object types:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getObjectTags(req, res) {
    try {
      const tags = await objectService.getObjectTags(req.user.effectiveTenantId)
      res.json(tags)
    } catch (error) {
      console.error('Error fetching object tags:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getImageCounts(req, res) {
    try {
      const counts = await objectService.getImageCounts(req.user.effectiveTenantId)
      res.json(counts)
    } catch (error) {
      console.error('Error fetching image counts:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getObjectLocations(req, res) {
    try {
      const objectId = parseInt(req.params.id)
      const locations = await objectService.getObjectLocations(objectId, req.user.effectiveTenantId)
      res.json(locations)
    } catch (error) {
      console.error('Error fetching object locations:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async updateObjectLocation(req, res) {
    try {
      const objectId = parseInt(req.params.id)
      const { lat, lng } = req.body
      
      const updatedObject = await objectService.updateObjectLocation(
        objectId, 
        lat, 
        lng, 
        req.user.effectiveTenantId
      )
      
      // Broadcast object update via WebSocket
      if (req.app.locals.wsManager) {
        req.app.locals.wsManager.broadcastObjectUpdated(req.user.effectiveTenantId, updatedObject)
      }
      
      res.json({
        message: 'Location updated successfully',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating object location:', error)
      if (error.message.includes('Invalid') || error.message === 'Object not found') {
        return res.status(400).json({ message: error.message })
      }
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async uploadImage(req, res) {
    try {
      const objectId = parseInt(req.params.id)
      
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' })
      }

      const result = await objectService.uploadImage(objectId, req.file, req.user.effectiveTenantId)

      // Broadcast image upload via WebSocket
      if (req.app.locals.wsManager) {
        req.app.locals.wsManager.broadcastImageUploaded(req.user.effectiveTenantId, {
          id: result.id,
          objectId: objectId,
          imageUrl: result.url,
          fileName: result.filename,
          createdAt: result.uploaded_at
        })
      }

      res.status(201).json({
        id: result.id,
        imageUrl: result.url,
        fileName: result.filename,
        createdAt: result.uploaded_at
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      if (error.message === 'Object not found') {
        return res.status(404).json({ message: error.message })
      }
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getObjectImages(req, res) {
    try {
      const objectId = parseInt(req.params.id)
      const images = await objectService.getObjectImages(objectId, req.user.effectiveTenantId)
      res.json(images)
    } catch (error) {
      console.error('Error fetching object images:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getRecentImages(req, res) {
    try {
      const images = await objectService.getRecentImages(req.user.effectiveTenantId)
      res.json(images)
    } catch (error) {
      console.error('Error fetching recent images:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async deleteImage(req, res) {
    try {
      const imageId = parseInt(req.params.id)
      await objectService.deleteImage(imageId, req.user.effectiveTenantId)
      res.json({ message: 'Image deleted successfully' })
    } catch (error) {
      console.error('Error deleting image:', error)
      if (error.message === 'Image not found') {
        return res.status(404).json({ message: error.message })
      }
      res.status(500).json({ message: 'Server error' })
    }
  }

  // Type configuration methods would go to a separate TypeConfigController
  static async getTypeConfigs(req, res) {
    try {
      // This should be moved to a TypeConfigService
      res.status(501).json({ message: 'Type configs moved to TypeConfigController' })
    } catch (error) {
      console.error('Error fetching type configs:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async createTypeConfig(req, res) {
    try {
      // This should be moved to a TypeConfigService
      res.status(501).json({ message: 'Type configs moved to TypeConfigController' })
    } catch (error) {
      console.error('Error creating type config:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async deleteTypeConfig(req, res) {
    try {
      // This should be moved to a TypeConfigService
      res.status(501).json({ message: 'Type configs moved to TypeConfigController' })
    } catch (error) {
      console.error('Error deleting type config:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
}
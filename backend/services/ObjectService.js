import { ObjectRepository } from '../repositories/ObjectRepository.js'
import { LocationRepository } from '../repositories/LocationRepository.js'
import { ImageRepository } from '../repositories/ImageRepository.js'
import { minioService } from './MinioService.js'

export class ObjectService {
  constructor() {
    this.objectRepo = new ObjectRepository()
    this.locationRepo = new LocationRepository()
    this.imageRepo = new ImageRepository()
  }

  async getObjects(tenantId, filters = {}) {
    return this.objectRepo.findByTenantWithFilters(tenantId, filters)
  }

  async getObjectsWithPaths(tenantId) {
    return this.objectRepo.findWithPaths(tenantId)
  }

  async getObjectById(id, tenantId) {
    return this.objectRepo.findById(id, tenantId)
  }

  async createObject(data, tenantId, userId) {
    const { name, type, lat, lng, description, tags, customFields } = data

    // Validate required fields
    if (!name || !type || lat === undefined || lng === undefined) {
      throw new Error('Name, type, latitude, and longitude are required')
    }

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid coordinates')
    }

    // Create object
    const object = await this.objectRepo.create({
      name,
      type,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      description,
      tags: tags || [],
      custom_fields: customFields || {},
      tenant_id: tenantId,
      created_by: userId
    })

    // Create initial location history entry
    await this.locationRepo.createLocationEntry({
      object_id: object.id,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      tenant_id: tenantId
    })

    return object
  }

  async deleteObject(id, tenantId) {
    // Check if object exists
    const object = await this.objectRepo.findById(id, tenantId)
    if (!object) {
      throw new Error('Object not found')
    }

    // Delete associated images from MinIO
    const images = await this.imageRepo.findByObjectId(id, tenantId)
    
    for (const image of images) {
      try {
        await minioService.deleteImage(image.object_name)
      } catch (error) {
        console.error('Error deleting image from MinIO:', error)
        // Continue with deletion even if MinIO fails
      }
    }

    // Delete object (CASCADE will handle location_history and images)
    return this.objectRepo.delete(id, tenantId)
  }

  async updateObjectLocation(id, lat, lng, tenantId) {
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid coordinates')
    }

    // Check if object exists
    const object = await this.objectRepo.findById(id, tenantId)
    if (!object) {
      throw new Error('Object not found')
    }

    // Update object location
    const updatedObject = await this.objectRepo.update(id, {
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    }, tenantId)

    // Add to location history
    await this.locationRepo.createLocationEntry({
      object_id: id,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      tenant_id: tenantId
    })

    return updatedObject
  }

  async getObjectLocations(id, tenantId) {
    return this.locationRepo.findByObjectId(id, tenantId)
  }

  async getObjectTypes(tenantId) {
    return this.objectRepo.getTypes(tenantId)
  }

  async getObjectTags(tenantId) {
    return this.objectRepo.getTags(tenantId)
  }

  async getImageCounts(tenantId) {
    return this.objectRepo.getImageCounts(tenantId)
  }

  async uploadImage(objectId, file, tenantId) {
    // Check if object exists
    const object = await this.objectRepo.findById(objectId, tenantId)
    if (!object) {
      throw new Error('Object not found')
    }

    // Upload to MinIO
    const imageData = await minioService.uploadImage(file, tenantId)

    // Save image record
    const image = await this.imageRepo.create({
      object_id: objectId,
      filename: imageData.filename,
      object_name: imageData.objectName,
      size: imageData.size,
      mime_type: imageData.mimeType,
      tenant_id: tenantId
    })

    return { ...image, url: imageData.url }
  }

  async getObjectImages(objectId, tenantId) {
    // Check if object exists first
    const object = await this.objectRepo.findById(objectId, tenantId)
    if (!object) {
      throw new Error('Object not found')
    }

    const images = await this.imageRepo.findByObjectId(objectId, tenantId)
    
    // Add URLs to images
    return images.map(image => ({
      ...image,
      url: minioService.getImageUrl(image.object_name)
    }))
  }

  async getRecentImages(tenantId) {
    const images = await this.imageRepo.findRecent(tenantId)
    
    // Add URLs to images
    return images.map(image => ({
      ...image,
      url: minioService.getImageUrl(image.object_name)
    }))
  }

  async deleteImage(imageId, tenantId) {
    const image = await this.imageRepo.findById(imageId, tenantId)
    if (!image) {
      throw new Error('Image not found')
    }

    // Delete from MinIO
    try {
      await minioService.deleteImage(image.object_name)
    } catch (error) {
      console.error('Error deleting image from MinIO:', error)
      // Continue with database deletion even if MinIO fails
    }

    // Delete from database
    return this.imageRepo.delete(imageId, tenantId)
  }
}

export const objectService = new ObjectService()
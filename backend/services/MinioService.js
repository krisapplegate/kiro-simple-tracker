import { Client } from 'minio'
import dotenv from 'dotenv'

dotenv.config()

class MinioService {
  constructor() {
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT) || 9000,
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    })
    
    this.bucketName = process.env.MINIO_BUCKET || 'location-images'
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return

    try {
      // Check if bucket exists, create if not
      const bucketExists = await this.client.bucketExists(this.bucketName)
      
      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1')
        console.log(`MinIO bucket '${this.bucketName}' created successfully`)
        
        // Set bucket policy to allow public read access for images
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`]
            }
          ]
        }
        
        await this.client.setBucketPolicy(this.bucketName, JSON.stringify(policy))
        console.log(`MinIO bucket policy set for public read access`)
      }
      
      this.initialized = true
      console.log('MinIO service initialized successfully')
    } catch (error) {
      console.error('MinIO initialization error:', error)
      throw error
    }
  }

  async uploadImage(buffer, fileName, contentType = 'image/jpeg') {
    await this.initialize()
    
    try {
      const objectName = `images/${Date.now()}-${fileName}`
      
      await this.client.putObject(
        this.bucketName,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': contentType,
          'Cache-Control': 'max-age=31536000' // 1 year cache
        }
      )
      
      // Generate public URL accessible from browser
      // Use localhost for browser access, but keep internal endpoint for server operations
      const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || 'localhost'
      const publicPort = process.env.MINIO_PUBLIC_PORT || process.env.MINIO_PORT || 9000
      const imageUrl = `http://${publicEndpoint}:${publicPort}/${this.bucketName}/${objectName}`
      
      return {
        success: true,
        imageUrl,
        objectName,
        fileName
      }
    } catch (error) {
      console.error('MinIO upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async deleteImage(objectName) {
    await this.initialize()
    
    try {
      await this.client.removeObject(this.bucketName, objectName)
      return { success: true }
    } catch (error) {
      console.error('MinIO delete error:', error)
      return { success: false, error: error.message }
    }
  }

  async getImageUrl(objectName) {
    await this.initialize()
    
    try {
      // Generate a presigned URL valid for 24 hours
      const url = await this.client.presignedGetObject(this.bucketName, objectName, 24 * 60 * 60)
      return { success: true, url }
    } catch (error) {
      console.error('MinIO get URL error:', error)
      return { success: false, error: error.message }
    }
  }

  getPublicUrl(objectName) {
    const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || 'localhost'
    const publicPort = process.env.MINIO_PUBLIC_PORT || process.env.MINIO_PORT || 9000
    return `http://${publicEndpoint}:${publicPort}/${this.bucketName}/${objectName}`
  }
}

export const minioService = new MinioService()
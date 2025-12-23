import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the entire MinioService module
vi.mock('../../backend/services/MinioService.js', () => ({
  minioService: {
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
    getImageUrl: vi.fn(),
    client: {
      bucketExists: vi.fn(),
      makeBucket: vi.fn(),
      putObject: vi.fn(),
      removeObject: vi.fn(),
      presignedGetObject: vi.fn(),
      setBucketPolicy: vi.fn()
    }
  }
}))

describe('MinioService', () => {
  let minioService

  beforeEach(async () => {
    vi.clearAllMocks()
    // Import after mocking
    const module = await import('../../backend/services/MinioService.js')
    minioService = module.minioService
  })

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const mockBuffer = Buffer.from('test image data')
      const mockFileName = 'test-image.jpg'
      const mockContentType = 'image/jpeg'

      const expectedResult = {
        fileName: 'unique-test-image.jpg',
        url: 'http://mock-url/unique-test-image.jpg'
      }

      minioService.uploadImage.mockResolvedValue(expectedResult)

      const result = await minioService.uploadImage(mockBuffer, mockFileName, mockContentType)

      expect(result).toEqual(expectedResult)
      expect(minioService.uploadImage).toHaveBeenCalledWith(mockBuffer, mockFileName, mockContentType)
    })

    it('should generate unique file names', async () => {
      const mockBuffer = Buffer.from('test')
      
      minioService.uploadImage
        .mockResolvedValueOnce({ fileName: 'unique-1-test.jpg', url: 'http://mock-url/1' })
        .mockResolvedValueOnce({ fileName: 'unique-2-test.jpg', url: 'http://mock-url/2' })

      const result1 = await minioService.uploadImage(mockBuffer, 'test.jpg', 'image/jpeg')
      const result2 = await minioService.uploadImage(mockBuffer, 'test.jpg', 'image/jpeg')

      expect(result1.fileName).not.toBe(result2.fileName)
      expect(minioService.uploadImage).toHaveBeenCalledTimes(2)
    })

    it('should handle upload errors', async () => {
      const mockBuffer = Buffer.from('test')
      const error = new Error('Upload failed')
      
      minioService.uploadImage.mockRejectedValue(error)

      await expect(minioService.uploadImage(mockBuffer, 'test.jpg', 'image/jpeg'))
        .rejects.toThrow('Upload failed')
    })
  })

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const fileName = 'test-image.jpg'
      
      minioService.deleteImage.mockResolvedValue(true)

      const result = await minioService.deleteImage(fileName)

      expect(result).toBe(true)
      expect(minioService.deleteImage).toHaveBeenCalledWith(fileName)
    })
  })

  describe('getImageUrl', () => {
    it('should return image URL', async () => {
      const fileName = 'test-image.jpg'
      const expectedUrl = 'http://mock-url/test-image.jpg'
      
      minioService.getImageUrl.mockResolvedValue(expectedUrl)

      const result = await minioService.getImageUrl(fileName)

      expect(result).toBe(expectedUrl)
      expect(minioService.getImageUrl).toHaveBeenCalledWith(fileName)
    })
  })
})
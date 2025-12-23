import express from 'express'
import multer from 'multer'
import { ObjectController } from '../controllers/ObjectController.js'
import { TypeConfigController } from '../controllers/TypeConfigController.js'
import { authenticateToken } from '../middleware/auth.js'
import { requirePermission, requireObjectAccess } from '../middleware/rbac.js'

const router = express.Router()

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'), false)
    }
  }
})

// Object routes
router.get('/objects', authenticateToken, requirePermission('objects.read'), ObjectController.getObjects)
router.post('/objects', authenticateToken, requirePermission('objects.create'), ObjectController.createObject)
router.delete('/objects/:id', authenticateToken, requireObjectAccess('delete'), ObjectController.deleteObject)

// Get objects with location history for path visualization
router.get('/objects/with-paths', authenticateToken, requirePermission('objects.read'), ObjectController.getObjectsWithPaths)

// Get object types and tags
router.get('/objects/types', authenticateToken, ObjectController.getObjectTypes)
router.get('/objects/tags', authenticateToken, ObjectController.getObjectTags)

// Get image counts for all objects
router.get('/objects/image-counts', authenticateToken, requirePermission('objects.read'), ObjectController.getImageCounts)

// Object location routes
router.get('/objects/:id/locations', authenticateToken, ObjectController.getObjectLocations)
router.put('/objects/:id/location', authenticateToken, requirePermission('objects.update'), ObjectController.updateObjectLocation)

// Image routes
router.post('/objects/:id/images', authenticateToken, requirePermission('objects.update'), upload.single('image'), ObjectController.uploadImage)
router.get('/objects/:id/images', authenticateToken, requirePermission('objects.read'), ObjectController.getObjectImages)
router.get('/images/recent', authenticateToken, requirePermission('objects.read'), ObjectController.getRecentImages)
router.delete('/images/:id', authenticateToken, requirePermission('objects.update'), ObjectController.deleteImage)

// Object Type Configuration endpoints
router.get('/object-type-configs', authenticateToken, requirePermission('types.read'), TypeConfigController.getTypeConfigs)
router.post('/object-type-configs', authenticateToken, requirePermission('types.create'), TypeConfigController.createTypeConfig)
router.delete('/object-type-configs/:typeName', authenticateToken, requirePermission('types.delete'), TypeConfigController.deleteTypeConfig)

export { router as objectRoutes }
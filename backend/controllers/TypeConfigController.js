import { TypeConfigService } from '../services/TypeConfigService.js'

export class TypeConfigController {
  static async getTypeConfigs(req, res) {
    try {
      const configs = await TypeConfigService.getTypeConfigs(req.user.effectiveTenantId)
      res.json(configs)
    } catch (error) {
      console.error('Error fetching type configs:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async createTypeConfig(req, res) {
    try {
      const config = await TypeConfigService.createTypeConfig(req.body, req.user.effectiveTenantId)
      res.json(config)
    } catch (error) {
      console.error('Error creating type config:', error)
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        return res.status(400).json({ message: error.message })
      }
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async deleteTypeConfig(req, res) {
    try {
      const typeName = req.params.typeName
      await TypeConfigService.deleteTypeConfig(typeName, req.user.effectiveTenantId)
      res.json({ message: 'Object type config deleted successfully' })
    } catch (error) {
      console.error('Error deleting type config:', error)
      if (error.message === 'Object type config not found') {
        return res.status(404).json({ message: error.message })
      }
      res.status(500).json({ message: 'Server error' })
    }
  }
}
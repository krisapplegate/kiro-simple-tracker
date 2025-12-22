import React, { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useTenant } from '../contexts/TenantContext'
import { X, MapPin, Tag, Plus, ChevronDown } from 'lucide-react'

const CreateObjectModal = ({ isOpen, onClose, location }) => {
  const { tenantId } = useTenant()
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    tags: [],
    customFields: {}
  })
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState({})
  const [showCustomType, setShowCustomType] = useState(false)
  const [customType, setCustomType] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📍')
  const [selectedColor, setSelectedColor] = useState('#6b7280')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const queryClient = useQueryClient()

  // Common emojis for object types
  const commonEmojis = [
    '🚗', '🚙', '🚚', '🏍️', '🚲', '🛵', // Vehicles
    '👤', '👥', '🧑‍💼', '👷', '🧑‍🔧', '🧑‍⚕️', // People
    '📦', '📱', '💻', '🖥️', '⌚', '📷', // Devices/Assets
    '🏠', '🏢', '🏭', '🏪', '🏫', '🏥', // Buildings
    '📍', '📌', '🎯', '⭐', '🔴', '🟢', // Markers
    '🔧', '⚙️', '🔨', '🛠️', '🔩', '⚡', // Tools
    '🌟', '💎', '🎁', '📋', '📊', '📈'  // Misc
  ]

  const commonColors = [
    '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
    '#ef4444', '#06b6d4', '#84cc16', '#f97316',
    '#6366f1', '#ec4899', '#14b8a6', '#f43f5e'
  ]

  // Fetch existing object types
  const { data: existingTypes = [] } = useQuery({
    queryKey: ['object-types', tenantId],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/objects/types', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) return []
      return response.json()
    },
    enabled: isOpen && !!tenantId
  })

  // Fetch object type configurations
  const { data: typeConfigs = {} } = useQuery({
    queryKey: ['object-type-configs', tenantId],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/object-type-configs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) return {}
      return response.json()
    },
    enabled: isOpen && !!tenantId
  })

  // Default types that are always available
  const defaultTypes = [
    { name: 'vehicle', count: 0 },
    { name: 'person', count: 0 },
    { name: 'asset', count: 0 },
    { name: 'device', count: 0 }
  ]

  // Combine existing types with defaults, avoiding duplicates
  const allTypes = [...defaultTypes]
  existingTypes.forEach(existingType => {
    if (!defaultTypes.find(dt => dt.name === existingType.name)) {
      allTypes.push(existingType)
    } else {
      // Update count for default types
      const defaultType = allTypes.find(dt => dt.name === existingType.name)
      if (defaultType) {
        defaultType.count = existingType.count
      }
    }
  })

  // Sort by usage count (descending) then alphabetically
  allTypes.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.name.localeCompare(b.name)
  })

  const createObjectMutation = useMutation({
    mutationFn: async (objectData) => {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/objects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(objectData)
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }))
        throw new Error(error.message || 'Failed to create object')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries(['objects', tenantId])
      queryClient.invalidateQueries(['object-types', tenantId])
      queryClient.invalidateQueries(['object-tags', tenantId])
      onClose()
      resetForm()
    },
    onError: (error) => {
      setErrors({ submit: error.message })
    }
  })

  const saveTypeConfigMutation = useMutation({
    mutationFn: async ({ typeName, emoji, color }) => {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/object-type-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ typeName, emoji, color })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }))
        throw new Error(error.message || 'Failed to save type configuration')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['object-type-configs', tenantId])
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      tags: [],
      customFields: {}
    })
    setNewTag('')
    setCustomType('')
    setShowCustomType(false)
    setSelectedEmoji('📍')
    setSelectedColor('#6b7280')
    setShowEmojiPicker(false)
    setErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    let finalType = formData.type
    if (showCustomType) {
      if (!customType.trim()) {
        newErrors.type = 'Custom type is required'
      } else {
        finalType = customType.trim().toLowerCase()
      }
    } else if (!formData.type) {
      newErrors.type = 'Type is required'
    }
    
    if (!location) {
      newErrors.location = 'Location is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      // If creating a custom type or updating an existing type's config
      if (showCustomType || (finalType && (!typeConfigs[finalType] || 
          typeConfigs[finalType].emoji !== selectedEmoji || 
          typeConfigs[finalType].color !== selectedColor))) {
        await saveTypeConfigMutation.mutateAsync({
          typeName: finalType,
          emoji: selectedEmoji,
          color: selectedColor
        })
      }

      // Create object with location
      const objectData = {
        ...formData,
        type: finalType,
        lat: location.lat,
        lng: location.lng
      }

      createObjectMutation.mutate(objectData)
    } catch (error) {
      setErrors({ submit: error.message })
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleTypeSelect = (typeName) => {
    handleInputChange('type', typeName)
    // Update emoji and color based on existing config
    const config = typeConfigs[typeName]
    if (config) {
      setSelectedEmoji(config.emoji)
      setSelectedColor(config.color)
    } else {
      // Set default emoji and color for new types
      const defaultEmojis = {
        vehicle: '🚗',
        person: '👤',
        asset: '📦',
        device: '📱'
      }
      const defaultColors = {
        vehicle: '#3b82f6',
        person: '#10b981',
        asset: '#8b5cf6',
        device: '#f59e0b'
      }
      setSelectedEmoji(defaultEmojis[typeName] || '📍')
      setSelectedColor(defaultColors[typeName] || '#6b7280')
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create New Object</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Location Display */}
          {location && (
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Location:</span>
                <span className="font-medium">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </span>
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter object name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            
            {!showCustomType ? (
              <div className="space-y-2">
                {/* Existing Types Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {allTypes.map((type) => {
                    const config = typeConfigs[type.name]
                    const emoji = config?.emoji || '📍'
                    const color = config?.color || '#6b7280'
                    
                    return (
                      <button
                        key={type.name}
                        type="button"
                        onClick={() => handleTypeSelect(type.name)}
                        className={`p-3 border rounded-md text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          formData.type === type.name
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">{emoji}</span>
                          <div className="font-medium capitalize">{type.name}</div>
                        </div>
                        {type.count > 0 && (
                          <div className="text-xs text-gray-500">{type.count} existing</div>
                        )}
                      </button>
                    )
                  })}
                </div>
                
                {/* Custom Type Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomType(true)
                    setFormData(prev => ({ ...prev, type: '' }))
                  }}
                  className="w-full p-3 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Custom Type</span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Custom Type Input */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="Enter custom type (e.g., drone, equipment)"
                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.type ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomType(false)
                      setCustomType('')
                      setFormData(prev => ({ ...prev, type: allTypes[0]?.name || 'vehicle' }))
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Enter a custom type name. It will be available for future objects.
                </p>
              </div>
            )}
            
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type}</p>
            )}
          </div>

          {/* Emoji and Color Customization */}
          {(formData.type || showCustomType) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon & Color
              </label>
              <div className="space-y-3">
                {/* Current Selection Preview */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                  <div 
                    className="w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {selectedEmoji}
                  </div>
                  <div>
                    <div className="font-medium">Preview</div>
                    <div className="text-sm text-gray-500">How it will appear on the map</div>
                  </div>
                </div>

                {/* Emoji Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Emoji</span>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      {showEmojiPicker ? 'Show Less' : 'Show More'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-8 gap-1">
                    {(showEmojiPicker ? commonEmojis : commonEmojis.slice(0, 16)).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`p-2 text-lg rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          selectedEmoji === emoji ? 'bg-primary-100 ring-2 ring-primary-500' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <span className="text-sm font-medium text-gray-700 mb-2 block">Background Color</span>
                  <div className="grid grid-cols-6 gap-2">
                    {commonColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                          selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter description (optional)"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-primary-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createObjectMutation.isLoading}
              className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createObjectMutation.isLoading ? 'Creating...' : 'Create Object'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateObjectModal
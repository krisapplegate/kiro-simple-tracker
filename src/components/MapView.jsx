import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Locate, Edit, Trash2, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTenant } from '../contexts/TenantContext'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom marker icons for different object types with emoji support
const createEmojiIcon = (emoji, color) => {
  return L.divIcon({
    className: 'custom-emoji-marker',
    html: `
      <div class="w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-lg" style="background-color: ${color}">
        ${emoji}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

// Fallback function for types without emoji config
const createCustomIcon = (color, type) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold" style="background-color: ${color}">
        ${type.charAt(0).toUpperCase()}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

const defaultTypeColors = {
  vehicle: '#3b82f6',
  person: '#10b981',
  asset: '#8b5cf6',
  device: '#f59e0b'
}

// Component to handle map clicks
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng)
    }
  })
  return null
}

const MapView = ({ filters, onMapClick, onObjectSelect, selectedObject }) => {
  const [userLocation, setUserLocation] = useState(null)
  const [map, setMap] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingObject, setEditingObject] = useState(null)
  const { user } = useAuth()
  const { tenantId, getApiHeaders } = useTenant()
  const queryClient = useQueryClient()

  // Fetch object type configurations
  const { data: typeConfigs = {} } = useQuery({
    queryKey: ['object-type-configs', tenantId],
    queryFn: async () => {
      const response = await fetch('/api/object-type-configs', {
        headers: getApiHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch object type configs')
      return response.json()
    },
    enabled: !!tenantId
  })

  // Helper function to get icon for object type
  const getObjectIcon = (type) => {
    const config = typeConfigs[type]
    if (config && config.emoji) {
      return createEmojiIcon(config.emoji, config.color)
    }
    // Fallback to letter-based icon with default colors
    const color = defaultTypeColors[type] || '#6b7280'
    return createCustomIcon(color, type)
  }

  // Delete object mutation
  const deleteObjectMutation = useMutation({
    mutationFn: async (objectId) => {
      const response = await fetch(`/api/objects/${objectId}`, {
        method: 'DELETE',
        headers: getApiHeaders()
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete object' }))
        throw new Error(error.message)
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries(['objects', tenantId])
      queryClient.invalidateQueries(['object-types', tenantId])
      queryClient.invalidateQueries(['object-tags', tenantId])
    },
    onError: (error) => {
      console.error('Delete error:', error)
      alert('Failed to delete object: ' + error.message)
    }
  })

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const canDelete = (object) => {
    return user && (user.role === 'admin' || object?.createdBy === user.id)
  }

  const handleEdit = (object) => {
    setEditingObject(object)
    setShowEditModal(true)
  }

  const handleDelete = (object) => {
    if (confirm(`Are you sure you want to delete "${object.name}"?\n\nThis action cannot be undone.`)) {
      deleteObjectMutation.mutate(object.id)
    }
  }

  // Fetch tracked objects
  const { data: objects = [], isLoading } = useQuery({
    queryKey: ['objects', tenantId, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.timeRange) params.append('timeRange', filters.timeRange)
      if (filters.objectTypes.length) params.append('types', filters.objectTypes.join(','))
      if (filters.tags.length) params.append('tags', filters.tags.join(','))
      
      const response = await fetch(`/api/objects?${params}`, {
        headers: getApiHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch objects')
      return response.json()
    },
    enabled: !!tenantId
  })

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])
          if (map) {
            map.setView([latitude, longitude], 15)
          }
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }

  useEffect(() => {
    getCurrentLocation()
  }, [])

  const defaultCenter = [37.7749, -122.4194] // San Francisco as default

  return (
    <div className="relative h-full">
      <MapContainer
        center={userLocation || defaultCenter}
        zoom={13}
        className="h-full w-full"
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Render tracked objects */}
        {objects.map((object) => (
          <Marker
            key={object.id}
            position={[object.lat, object.lng]}
            icon={getObjectIcon(object.type)}
            eventHandlers={{
              click: () => onObjectSelect(object)
            }}
          >
            <Popup>
              <div className="p-3 min-w-[200px]">
                {/* Header with name and status */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{object.name}</h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(object.status)}`}>
                    {object.status || 'active'}
                  </span>
                </div>
                
                {/* Object details */}
                <div className="space-y-1 mb-3">
                  <p className="text-sm text-gray-600 capitalize">
                    <strong>Type:</strong> {object.type}
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Last updated:</strong> {new Date(object.lastUpdate).toLocaleString()}
                  </p>
                  {object.description && (
                    <p className="text-xs text-gray-600">
                      <strong>Description:</strong> {object.description}
                    </p>
                  )}
                  {object.tags && object.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {object.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex space-x-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onObjectSelect(object)
                    }}
                    className="flex-1 flex items-center justify-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                  >
                    View Details
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(object)
                    }}
                    className="flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </button>
                  
                  {canDelete(object) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(object)
                      }}
                      disabled={deleteObjectMutation.isPending}
                      className="flex items-center justify-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {deleteObjectMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>Your current location</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating action buttons */}
      <div className="absolute bottom-6 right-6 flex flex-col space-y-3 z-[1000]">
        <button
          onClick={getCurrentLocation}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          title="Get current location"
        >
          <Locate className="h-5 w-5 text-gray-600" />
        </button>
        
        <button
          onClick={() => {
            const center = map?.getCenter()
            if (center) {
              onMapClick(center)
            } else {
              onMapClick({ lat: 37.7749, lng: -122.4194 })
            }
          }}
          className="w-12 h-12 bg-primary-600 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
          title="Add new object"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingObject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Object</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingObject(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  defaultValue={editingObject.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Object name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  defaultValue={editingObject.description || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Object description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  defaultValue={editingObject.tags ? editingObject.tags.join(', ') : ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tags separated by commas"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingObject(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // For now, just close the modal
                  // TODO: Implement actual update functionality
                  alert('Edit functionality coming soon!')
                  setShowEditModal(false)
                  setEditingObject(null)
                }}
                className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapView
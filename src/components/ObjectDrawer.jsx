import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { 
  X, 
  MapPin, 
  Clock, 
  Tag, 
  Edit, 
  Trash2, 
  Navigation,
  Calendar,
  AlertTriangle
} from 'lucide-react'

const ObjectDrawer = ({ object, onClose }) => {
  const [activeTab, setActiveTab] = useState('details')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch object location history
  const { data: locationHistory = [] } = useQuery({
    queryKey: ['object-history', object?.id],
    queryFn: async () => {
      if (!object?.id) return []
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/objects/${object.id}/locations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch location history')
      return response.json()
    },
    enabled: !!object?.id
  })

  // Delete object mutation
  const deleteObjectMutation = useMutation({
    mutationFn: async (objectId) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/objects/${objectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete object' }))
        throw new Error(error.message)
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries(['objects'])
      queryClient.invalidateQueries(['object-types'])
      queryClient.invalidateQueries(['object-tags'])
      onClose()
    },
    onError: (error) => {
      console.error('Delete error:', error)
      // You could add a toast notification here
    }
  })

  // Check if user can delete this object
  const canDelete = user && object && (user.role === 'admin' || object.createdBy === user.id)
  


  const handleDelete = () => {
    if (object?.id) {
      deleteObjectMutation.mutate(object.id)
      setShowDeleteConfirm(false)
    }
  }

  if (!object) return null

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div 
      className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-xl flex flex-col md:max-w-md"
      style={{
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        right: 0,
        height: '100vh',
        width: '100%',
        maxWidth: '384px',
        backgroundColor: 'white',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{object.name}</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'details'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'history'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && (
          <div className="p-4 space-y-6">
            {/* Status */}
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(object.status)}`}>
                {object.status || 'active'}
              </span>
            </div>

            {/* Object Information */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{object?.type || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Last Update:</span>
                <span className="font-medium">
                  {object?.lastUpdate ? new Date(object.lastUpdate).toLocaleString() : 'Unknown'}
                </span>
              </div>
              
              {object?.lat && object?.lng && (
                <div className="flex items-center space-x-2 text-sm">
                  <Navigation className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">
                    {typeof object.lat === 'number' && typeof object.lng === 'number' 
                      ? `${object.lat.toFixed(6)}, ${object.lng.toFixed(6)}` 
                      : 'Invalid coordinates'}
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {object.tags && object.tags.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 text-sm mb-2">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Tags:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {object.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {object.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-sm text-gray-600">{object.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2 pt-4 border-t border-gray-200">
              <button 
                onClick={() => setShowEditModal(true)}
                className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              {(user && (user.role === 'admin' || object?.createdBy === user.id)) && (
                <button 
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${object?.name}"?\n\nThis action cannot be undone.`)) {
                      deleteObjectMutation.mutate(object.id)
                    }
                  }}
                  disabled={deleteObjectMutation.isPending}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteObjectMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>



            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Delete Object</h3>
                      <p className="text-sm text-gray-500">This action cannot be undone.</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-6">
                    Are you sure you want to delete "<strong>{object.name}</strong>"? 
                    This will also remove all location history for this object.
                  </p>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteObjectMutation.isPending}
                      className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteObjectMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Edit Object</h3>
                    <button
                      onClick={() => setShowEditModal(false)}
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
                        defaultValue={object.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Object name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        rows={3}
                        defaultValue={object.description || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Object description"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                      <input
                        type="text"
                        defaultValue={object.tags ? object.tags.join(', ') : ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter tags separated by commas"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => setShowEditModal(false)}
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
        )}

        {activeTab === 'history' && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Location History</h3>
            
            {locationHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No location history available.</p>
            ) : (
              <div className="space-y-3">
                {locationHistory.map((location, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{formatDate(location.timestamp)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                      </div>
                      {location.address && (
                        <p className="text-sm text-gray-500 mt-1">{location.address}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ObjectDrawer
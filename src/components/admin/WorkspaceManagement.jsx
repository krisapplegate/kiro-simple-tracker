import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Building2, 
  Users, 
  MapPin, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  AlertTriangle,
  Database,
  Calendar
} from 'lucide-react'

const WorkspaceManagement = () => {
  const queryClient = useQueryClient()
  const [expandedWorkspaces, setExpandedWorkspaces] = useState(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selectedObjects, setSelectedObjects] = useState(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Fetch all workspaces with statistics
  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces')
      }
      
      return response.json()
    }
  })

  // Fetch objects for a specific workspace
  const { data: allObjects = [] } = useQuery({
    queryKey: ['admin-objects'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/objects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch objects')
      }
      
      return response.json()
    }
  })

  // Delete workspace mutation
  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (workspaceId) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/tenants/${workspaceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete workspace')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-workspaces'])
      queryClient.invalidateQueries(['admin-objects'])
      setDeleteConfirm(null)
    }
  })

  // Delete object mutation
  const deleteObjectMutation = useMutation({
    mutationFn: async (objectId) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/objects/${objectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete object')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-workspaces'])
      queryClient.invalidateQueries(['admin-objects'])
      setDeleteConfirm(null) // Close the modal after successful deletion
    }
  })

  // Bulk delete objects mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (objectIds) => {
      const token = localStorage.getItem('token')
      const results = await Promise.all(
        objectIds.map(async (objectId) => {
          const response = await fetch(`/api/admin/objects/${objectId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (!response.ok) {
            const error = await response.json()
            throw new Error(`Failed to delete object ${objectId}: ${error.message}`)
          }
          
          return response.json()
        })
      )
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-workspaces'])
      queryClient.invalidateQueries(['admin-objects'])
      setSelectedObjects(new Set())
      setShowBulkActions(false)
      setDeleteConfirm(null)
    }
  })

  const toggleWorkspaceExpansion = (workspaceId) => {
    const newExpanded = new Set(expandedWorkspaces)
    if (newExpanded.has(workspaceId)) {
      newExpanded.delete(workspaceId)
    } else {
      newExpanded.add(workspaceId)
    }
    setExpandedWorkspaces(newExpanded)
  }

  const getObjectsForWorkspace = (workspaceId) => {
    return allObjects.filter(obj => obj.tenant_id === workspaceId)
  }

  const handleDeleteWorkspace = (workspace) => {
    setDeleteConfirm({
      type: 'workspace',
      item: workspace,
      title: `Delete Workspace "${workspace.name}"`,
      message: `This will permanently delete the workspace "${workspace.name}" and ALL of its data including:
        • ${workspace.stats.user_count} users
        • ${workspace.stats.object_count} tracked objects
        • ${workspace.stats.location_history_count} location history records
        
        This action cannot be undone.`
    })
  }

  const handleDeleteObject = (object) => {
    setDeleteConfirm({
      type: 'object',
      item: object,
      title: `Delete Object "${object.name}"`,
      message: `This will permanently delete the object "${object.name}" and all its location history. This action cannot be undone.`
    })
  }

  const handleBulkDelete = () => {
    const selectedObjectsArray = Array.from(selectedObjects)
    setDeleteConfirm({
      type: 'bulk',
      item: { ids: selectedObjectsArray, count: selectedObjectsArray.length },
      title: `Delete ${selectedObjectsArray.length} Objects`,
      message: `This will permanently delete ${selectedObjectsArray.length} selected objects and all their location history. This action cannot be undone.`
    })
  }

  const toggleObjectSelection = (objectId) => {
    const newSelected = new Set(selectedObjects)
    if (newSelected.has(objectId)) {
      newSelected.delete(objectId)
    } else {
      newSelected.add(objectId)
    }
    setSelectedObjects(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const toggleSelectAllObjects = (workspaceId) => {
    const workspaceObjects = getObjectsForWorkspace(workspaceId)
    const workspaceObjectIds = workspaceObjects.map(obj => obj.id)
    const allSelected = workspaceObjectIds.every(id => selectedObjects.has(id))
    
    const newSelected = new Set(selectedObjects)
    if (allSelected) {
      // Deselect all objects in this workspace
      workspaceObjectIds.forEach(id => newSelected.delete(id))
    } else {
      // Select all objects in this workspace
      workspaceObjectIds.forEach(id => newSelected.add(id))
    }
    
    setSelectedObjects(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const confirmDelete = () => {
    if (deleteConfirm.type === 'workspace') {
      deleteWorkspaceMutation.mutate(deleteConfirm.item.id)
    } else if (deleteConfirm.type === 'object') {
      deleteObjectMutation.mutate(deleteConfirm.item.id)
    } else if (deleteConfirm.type === 'bulk') {
      bulkDeleteMutation.mutate(deleteConfirm.item.ids)
    }
  }

  if (workspacesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Workspace Management</h2>
          <p className="text-sm text-gray-500">
            Manage all workspaces and their objects across the system
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedObjects.size} object{selectedObjects.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSelectedObjects(new Set())
                  setShowBulkActions(false)
                }}
                className="px-3 py-1 text-sm text-blue-700 hover:text-blue-900 transition-colors"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                <span>
                  {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedObjects.size}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspaces List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Workspaces</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {workspaces.map((workspace) => {
            const isExpanded = expandedWorkspaces.has(workspace.id)
            const workspaceObjects = getObjectsForWorkspace(workspace.id)
            
            return (
              <div key={workspace.id} className="p-6">
                {/* Workspace Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleWorkspaceExpansion(workspace.id)}
                      className="flex items-center space-x-2 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <Building2 className="h-6 w-6 text-primary-600" />
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {workspace.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Workspace ID: {workspace.id}
                        </p>
                      </div>
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    {/* Statistics */}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{workspace.stats.user_count} users</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{workspace.stats.object_count} objects</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Database className="h-4 w-4" />
                        <span>{workspace.stats.location_history_count} locations</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(workspace.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    {workspace.id !== 1 && (
                      <button
                        onClick={() => handleDeleteWorkspace(workspace)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete workspace"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Content - Objects */}
                {isExpanded && (
                  <div className="mt-6 ml-7">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">
                        Objects in this workspace ({workspaceObjects.length})
                      </h5>
                      
                      {workspaceObjects.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No objects in this workspace</p>
                      ) : (
                        <div className="space-y-2">
                          {/* Select All Header */}
                          <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                            <label className="flex items-center space-x-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={workspaceObjects.length > 0 && workspaceObjects.every(obj => selectedObjects.has(obj.id))}
                                onChange={() => toggleSelectAllObjects(workspace.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span>Select All ({workspaceObjects.length} objects)</span>
                            </label>
                            {selectedObjects.size > 0 && (
                              <span className="text-xs text-blue-600">
                                {selectedObjects.size} selected
                              </span>
                            )}
                          </div>
                          
                          {workspaceObjects.map((object) => (
                            <div
                              key={object.id}
                              className={`flex items-center justify-between p-3 rounded border transition-colors ${
                                selectedObjects.has(object.id) 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={selectedObjects.has(object.id)}
                                  onChange={() => toggleObjectSelection(object.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {object.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Type: {object.type} • Created by: {object.created_by_email || 'Unknown'}
                                  </p>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleDeleteObject(object)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete object"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">
                {deleteConfirm.title}
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {deleteConfirm.message}
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteWorkspaceMutation.isLoading || deleteObjectMutation.isLoading || bulkDeleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
              >
                {(deleteWorkspaceMutation.isLoading || deleteObjectMutation.isLoading || bulkDeleteMutation.isPending) ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkspaceManagement
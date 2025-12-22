import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Key, 
  Users,
  Search,
  X,
  Check
} from 'lucide-react'

const RoleManagement = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/rbac/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch roles')
      return response.json()
    }
  })

  // Fetch permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/rbac/permissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch permissions')
      return response.json()
    }
  })

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData) => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleData)
      })
      if (!response.ok) throw new Error('Failed to create role')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rbac-roles'])
      setShowCreateModal(false)
    }
  })

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/rbac/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to delete role')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rbac-roles'])
    }
  })

  // Filter roles
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group permissions by resource
  const permissionsByResource = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = []
    }
    acc[permission.resource].push(permission)
    return acc
  }, {})

  const handleCreateRole = (formData) => {
    createRoleMutation.mutate(formData)
  }

  const handleDeleteRole = (role) => {
    if (role.is_system_role) {
      alert('System roles cannot be deleted')
      return
    }
    
    if (confirm(`Are you sure you want to delete the role "${role.display_name}"?`)) {
      deleteRoleMutation.mutate(role.id)
    }
  }

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Role Management</h2>
          <p className="text-sm text-gray-600">Manage roles and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <div key={role.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className={`h-8 w-8 ${
                    role.is_system_role ? 'text-blue-600' : 'text-primary-600'
                  }`} />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{role.display_name}</h3>
                  <p className="text-sm text-gray-500">{role.name}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setEditingRole(role)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
                {!role.is_system_role && (
                  <button
                    onClick={() => handleDeleteRole(role)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{role.description}</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Permissions:</span>
                <span className="font-medium">{role.permissions?.length || 0}</span>
              </div>
              
              {role.is_system_role && (
                <div className="flex items-center text-xs text-blue-600">
                  <Shield className="h-3 w-3 mr-1" />
                  System Role
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setEditingRole(role)}
                className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Key className="h-4 w-4 mr-2" />
                View Permissions
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRole}
          permissions={permissions}
          permissionsByResource={permissionsByResource}
          isLoading={createRoleMutation.isPending}
        />
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <EditRoleModal
          role={editingRole}
          permissions={permissions}
          permissionsByResource={permissionsByResource}
          onClose={() => setEditingRole(null)}
        />
      )}
    </div>
  )
}

// Create Role Modal Component
const CreateRoleModal = ({ onClose, onSubmit, permissions, permissionsByResource, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    permissions: []
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handlePermissionToggle = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const handleResourceToggle = (resource) => {
    const resourcePermissions = permissionsByResource[resource]?.map(p => p.id) || []
    const allSelected = resourcePermissions.every(id => formData.permissions.includes(id))
    
    if (allSelected) {
      // Remove all resource permissions
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(id => !resourcePermissions.includes(id))
      }))
    } else {
      // Add all resource permissions
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...resourcePermissions])]
      }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Create New Role</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Basic Information</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., custom_manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Custom Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe the role's purpose and responsibilities"
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Permissions</h4>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => (
                  <div key={resource} className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-gray-900 capitalize">{resource}</h5>
                      <button
                        type="button"
                        onClick={() => handleResourceToggle(resource)}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        {resourcePermissions.every(p => formData.permissions.includes(p.id)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    
                    <div className="space-y-1">
                      {resourcePermissions.map((permission) => (
                        <label key={permission.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => handlePermissionToggle(permission.id)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{permission.display_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Role Modal Component
const EditRoleModal = ({ role, permissions, permissionsByResource, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Role Details: {role.display_name}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Role Information</h4>
              
              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-sm text-gray-900">{role.name}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Display Name:</span>
                  <span className="ml-2 text-sm text-gray-900">{role.display_name}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Description:</span>
                  <span className="ml-2 text-sm text-gray-900">{role.description}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Type:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {role.is_system_role ? 'System Role' : 'Custom Role'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Permissions:</span>
                  <span className="ml-2 text-sm text-gray-900">{role.permissions?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Assigned Permissions</h4>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => {
                  const rolePermissionIds = role.permissions?.map(p => p.id) || []
                  const resourceRolePermissions = resourcePermissions.filter(p => 
                    rolePermissionIds.includes(p.id)
                  )
                  
                  if (resourceRolePermissions.length === 0) return null
                  
                  return (
                    <div key={resource} className="border border-gray-200 rounded-md p-3">
                      <h5 className="text-sm font-medium text-gray-900 capitalize mb-2">{resource}</h5>
                      <div className="space-y-1">
                        {resourceRolePermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center">
                            <Check className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-sm text-gray-700">{permission.display_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoleManagement
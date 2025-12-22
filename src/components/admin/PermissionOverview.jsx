import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Key, 
  Shield, 
  Search,
  Filter,
  Info
} from 'lucide-react'

const PermissionOverview = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState('')

  // Fetch permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
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

  // Fetch roles to show permission usage
  const { data: roles = [] } = useQuery({
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

  // Group permissions by resource
  const permissionsByResource = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = []
    }
    acc[permission.resource].push(permission)
    return acc
  }, {})

  // Get unique resources for filtering
  const resources = Object.keys(permissionsByResource).sort()

  // Filter permissions
  const filteredResources = resources.filter(resource => {
    if (selectedResource && resource !== selectedResource) return false
    
    const resourcePermissions = permissionsByResource[resource]
    return resourcePermissions.some(permission =>
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Get permission usage count
  const getPermissionUsage = (permissionId) => {
    return roles.reduce((count, role) => {
      const hasPermission = role.permissions?.some(p => p.id === permissionId)
      return hasPermission ? count + 1 : count
    }, 0)
  }

  if (permissionsLoading) {
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
          <h2 className="text-xl font-semibold text-gray-900">Permission Overview</h2>
          <p className="text-sm text-gray-600">View all available permissions and their usage across roles</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Key className="h-4 w-4" />
          <span>{permissions.length} total permissions</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="relative">
          <Filter className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <select
            value={selectedResource}
            onChange={(e) => setSelectedResource(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Resources</option>
            {resources.map(resource => (
              <option key={resource} value={resource}>{resource}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Permission Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <Key className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Permissions</p>
              <p className="text-2xl font-semibold text-gray-900">{permissions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Resources</p>
              <p className="text-2xl font-semibold text-gray-900">{resources.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <Info className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Roles</p>
              <p className="text-2xl font-semibold text-gray-900">{roles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <Key className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Avg Usage</p>
              <p className="text-2xl font-semibold text-gray-900">
                {permissions.length > 0 ? Math.round(
                  permissions.reduce((sum, p) => sum + getPermissionUsage(p.id), 0) / permissions.length
                ) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions by Resource */}
      <div className="space-y-6">
        {filteredResources.map((resource) => {
          const resourcePermissions = permissionsByResource[resource].filter(permission =>
            permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            permission.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            permission.description.toLowerCase().includes(searchTerm.toLowerCase())
          )

          return (
            <div key={resource} className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 capitalize">{resource}</h3>
                  <span className="text-sm text-gray-500">
                    {resourcePermissions.length} permission{resourcePermissions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resourcePermissions.map((permission) => {
                    const usageCount = getPermissionUsage(permission.id)
                    
                    return (
                      <div key={permission.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {permission.display_name}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono">
                              {permission.name}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <Shield className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600">{usageCount}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {permission.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            Used in {usageCount} role{usageCount !== 1 ? 's' : ''}
                          </span>
                          <div className={`px-2 py-1 rounded-full ${
                            usageCount === 0 
                              ? 'bg-gray-100 text-gray-600' 
                              : usageCount <= 2 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {usageCount === 0 ? 'Unused' : usageCount <= 2 ? 'Low usage' : 'Active'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <Key className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No permissions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search terms or filters.
          </p>
        </div>
      )}
    </div>
  )
}

export default PermissionOverview
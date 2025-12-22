import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Building2, Users, MapPin, Activity, ChevronRight, Plus } from 'lucide-react'

const TenantSelectorPage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTenantName, setNewTenantName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    fetchUserTenants()
  }, [])

  const fetchUserTenants = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tenants')
      }

      const data = await response.json()
      setTenants(data)
      
      // If user only has access to one tenant, redirect directly
      if (data.length === 1) {
        navigate(`/tenant/${data[0].id}/dashboard`)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
      setError('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const handleTenantSelect = (tenant) => {
    navigate(`/tenant/${tenant.id}/dashboard`)
  }

  const handleCreateTenant = async () => {
    if (!newTenantName.trim()) {
      setCreateError('Workspace name is required')
      return
    }

    setCreating(true)
    setCreateError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newTenantName.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create workspace' }))
        throw new Error(errorData.message)
      }

      const newTenant = await response.json()
      
      // Refresh the tenants list
      await fetchUserTenants()
      
      // Close modal and navigate to new tenant
      setShowCreateModal(false)
      setNewTenantName('')
      navigate(`/tenant/${newTenant.id}/dashboard`)
      
    } catch (error) {
      console.error('Error creating tenant:', error)
      setCreateError(error.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your workspaces...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Location Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.email}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Select a Workspace
          </h2>
          <p className="text-lg text-gray-600">
            Choose which workspace you'd like to access
          </p>
        </div>

        {tenants.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No Workspaces Available
            </h3>
            <p className="text-gray-600">
              You don't have access to any workspaces yet. Contact your administrator.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Create New Workspace Card */}
            <div
              onClick={() => setShowCreateModal(true)}
              className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-6 cursor-pointer hover:shadow-md hover:border-blue-400 transition-all duration-200 group flex flex-col items-center justify-center min-h-[200px]"
            >
              <div className="bg-blue-50 rounded-lg p-4 mb-4 group-hover:bg-blue-100 transition-colors">
                <Plus className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
                Create New Workspace
              </h3>
              <p className="text-sm text-gray-500 text-center">
                Set up a new workspace for your team or project
              </p>
            </div>

            {/* Existing Workspaces */}
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                onClick={() => handleTenantSelect(tenant)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-blue-100 rounded-lg p-3 mr-4">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                        {tenant.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {tenant.user_role || 'Member'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                </div>

                {/* Tenant Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Role: {tenant.user_role}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Activity className="h-4 w-4 mr-2" />
                    <span>Active</span>
                  </div>
                </div>

                {/* Roles */}
                {tenant.roles && tenant.roles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {tenant.roles.slice(0, 3).map((role) => (
                        <span
                          key={role.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {role.display_name}
                        </span>
                      ))}
                      {tenant.roles.length > 3 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          +{tenant.roles.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create New Workspace</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewTenantName('')
                  setCreateError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700 mb-2">
                Workspace Name
              </label>
              <input
                type="text"
                id="workspaceName"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter workspace name..."
                disabled={creating}
              />
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{createError}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewTenantName('')
                  setCreateError('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTenant}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creating || !newTenantName.trim()}
              >
                {creating ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TenantSelectorPage
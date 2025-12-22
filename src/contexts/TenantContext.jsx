import React, { createContext, useContext, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const TenantContext = createContext()

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

export const TenantProvider = ({ children }) => {
  const { user } = useAuth()
  const { tenantId } = useParams()
  const navigate = useNavigate()
  
  const [currentTenant, setCurrentTenant] = useState(null)
  const [tenantUser, setTenantUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user && tenantId) {
      loadTenantData(parseInt(tenantId))
    }
  }, [user, tenantId])

  const loadTenantData = async (tid) => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      
      // Fetch tenant info
      const tenantResponse = await fetch(`/api/tenants/${tid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!tenantResponse.ok) {
        if (tenantResponse.status === 403) {
          throw new Error('You do not have access to this workspace')
        }
        throw new Error('Failed to load workspace')
      }
      
      const tenantData = await tenantResponse.json()
      setCurrentTenant(tenantData)
      
      // Fetch user info for this tenant
      const userResponse = await fetch(`/api/tenants/${tid}/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setTenantUser(userData)
      }
      
    } catch (error) {
      console.error('Error loading tenant data:', error)
      setError(error.message)
      // Redirect to tenant selector on error
      setTimeout(() => navigate('/'), 2000)
    } finally {
      setLoading(false)
    }
  }

  const switchTenant = (tenant) => {
    navigate(`/tenant/${tenant.id}/dashboard`)
  }

  const value = {
    currentTenant,
    tenantUser,
    tenantId: parseInt(tenantId),
    loading,
    error,
    switchTenant,
    reloadTenant: () => loadTenantData(parseInt(tenantId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workspace...</p>
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
          <p className="text-sm text-gray-500">Redirecting to workspace selector...</p>
        </div>
      </div>
    )
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}
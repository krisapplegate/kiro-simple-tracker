import React, { createContext, useContext, useState, useEffect } from 'react'
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
  const [currentTenant, setCurrentTenant] = useState(null)
  const [tenants, setTenants] = useState([])

  useEffect(() => {
    if (user) {
      // Set default tenant or load from user preferences
      setCurrentTenant(user.tenant)
      setTenants([user.tenant]) // In a real app, user might have access to multiple tenants
    }
  }, [user])

  const switchTenant = (tenant) => {
    setCurrentTenant(tenant)
  }

  const value = {
    currentTenant,
    tenants,
    switchTenant
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}
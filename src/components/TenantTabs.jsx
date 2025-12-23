import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Plus, Building2 } from 'lucide-react'

const TenantTabs = ({ children }) => {
  const navigate = useNavigate()
  const { tenantId } = useParams()
  const currentTenantId = parseInt(tenantId)
  
  const [openTabs, setOpenTabs] = useState([])
  const [availableTenants, setAvailableTenants] = useState([])
  const [showTenantSelector, setShowTenantSelector] = useState(false)

  // Load open tabs from localStorage
  const loadOpenTabs = () => {
    try {
      const savedTabs = localStorage.getItem('openTenantTabs')
      if (savedTabs) {
        const tabs = JSON.parse(savedTabs)
        // Validate the structure of saved tabs
        if (Array.isArray(tabs) && tabs.every(tab => 
          tab && typeof tab.id === 'number' && typeof tab.name === 'string'
        )) {
          return tabs
        } else {
          console.warn('Invalid tab data in localStorage, clearing...')
          localStorage.removeItem('openTenantTabs')
        }
      }
    } catch (error) {
      console.error('Error loading open tabs:', error)
      // Clear corrupted data
      localStorage.removeItem('openTenantTabs')
    }
    return []
  }

  // Save open tabs to localStorage
  const saveOpenTabs = (tabs) => {
    try {
      localStorage.setItem('openTenantTabs', JSON.stringify(tabs))
    } catch (error) {
      console.error('Error saving open tabs:', error)
    }
  }

  useEffect(() => {
    // Load available tenants first
    fetchAvailableTenants()
  }, [])

  useEffect(() => {
    // Load previously opened tabs after component mounts
    const savedTabs = loadOpenTabs()
    if (savedTabs.length > 0) {
      setOpenTabs(savedTabs)
    }
  }, [])

  useEffect(() => {
    // Ensure current tenant is in the tabs when we have both tenant ID and available tenants
    if (currentTenantId && availableTenants.length > 0) {
      ensureCurrentTenantInTabs(currentTenantId, openTabs)
    }
  }, [currentTenantId, availableTenants])

  useEffect(() => {
    // When tenant changes, ensure it's in the open tabs
    if (currentTenantId && availableTenants.length > 0) {
      ensureCurrentTenantInTabs(currentTenantId, openTabs)
    }
  }, [currentTenantId, availableTenants])

  // Save tabs whenever they change (but not on initial empty state)
  useEffect(() => {
    if (openTabs.length > 0) {
      saveOpenTabs(openTabs)
    }
  }, [openTabs])

  const fetchAvailableTenants = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const tenants = await response.json()
        setAvailableTenants(tenants)
        
        // Clean up any tabs for tenants the user no longer has access to
        cleanupInvalidTabs(tenants)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    }
  }

  const cleanupInvalidTabs = (validTenants) => {
    const validTenantIds = validTenants.map(t => t.id)
    setOpenTabs(prev => {
      const validTabs = prev.filter(tab => validTenantIds.includes(tab.id))
      // Only update if there's a change to avoid unnecessary re-renders
      return validTabs.length !== prev.length ? validTabs : prev
    })
  }

  const ensureCurrentTenantInTabs = async (tid, currentTabs) => {
    // Check if current tenant is already in tabs
    const existingTab = currentTabs.find(tab => tab.id === tid)
    if (existingTab) {
      return
    }

    // Find tenant info from available tenants or fetch it
    let tenantInfo = availableTenants.find(t => t.id === tid)
    
    if (!tenantInfo) {
      // Fetch tenant info if not in available tenants
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/tenants/${tid}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          tenantInfo = await response.json()
        }
      } catch (error) {
        console.error('Error loading tenant info:', error)
        return
      }
    }

    if (tenantInfo) {
      setOpenTabs(prev => {
        // Double-check that the tab isn't already there (race condition protection)
        const stillNotThere = !prev.find(tab => tab.id === tid)
        if (stillNotThere) {
          const newTabs = [...prev, { 
            id: tid, 
            name: tenantInfo.name, 
            active: true 
          }]
          return newTabs
        }
        return prev
      })
    }
  }

  const switchToTab = (tabTenantId) => {
    if (tabTenantId !== currentTenantId) {
      navigate(`/tenant/${tabTenantId}/dashboard`)
    }
  }

  const closeTab = (tabTenantId, event) => {
    event.stopPropagation()
    
    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabTenantId)
      
      // If closing the current tab, switch to another tab or go to selector
      if (tabTenantId === currentTenantId) {
        if (newTabs.length > 0) {
          navigate(`/tenant/${newTabs[0].id}/dashboard`)
        } else {
          navigate('/')
        }
      }
      
      return newTabs
    })
  }

  const openNewTab = (tenant) => {
    setShowTenantSelector(false)
    
    // Check if tab is already open
    const existingTab = openTabs.find(tab => tab.id === tenant.id)
    if (existingTab) {
      switchToTab(tenant.id)
      return
    }
    
    // Add new tab and switch to it
    setOpenTabs(prev => [...prev, { id: tenant.id, name: tenant.name, active: true }])
    navigate(`/tenant/${tenant.id}/dashboard`)
  }

  const getAvailableTenantsForNewTab = () => {
    return availableTenants.filter(tenant => 
      !openTabs.find(tab => tab.id === tenant.id)
    )
  }

  // Clear all tabs (useful for logout)
  const clearAllTabs = () => {
    setOpenTabs([])
    localStorage.removeItem('openTenantTabs')
  }

  // Debug function to check tab state
  const debugTabState = () => {
    console.log('Current tabs:', openTabs)
    console.log('Available tenants:', availableTenants)
    console.log('Current tenant ID:', currentTenantId)
    console.log('Saved tabs in localStorage:', localStorage.getItem('openTenantTabs'))
  }

  // Expose debug function globally for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.debugTenantTabs = debugTabState
    }
  }, [openTabs, availableTenants, currentTenantId])

  // Expose clearAllTabs function globally for logout
  useEffect(() => {
    window.clearTenantTabs = clearAllTabs
    return () => {
      delete window.clearTenantTabs
    }
  }, [])

  return (
    <div className="h-screen flex flex-col">
      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-200 flex items-center px-4">
        <div className="flex items-center space-x-1 flex-1 overflow-x-auto">
          {openTabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => switchToTab(tab.id)}
              className={`
                flex items-center px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer
                transition-colors duration-200 min-w-0 max-w-48
                ${tab.id === currentTenantId
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{tab.name}</span>
              {openTabs.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="ml-2 p-1 rounded hover:bg-gray-200 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Add Tab Button */}
        <div className="relative ml-2">
          <button
            onClick={() => setShowTenantSelector(!showTenantSelector)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Open new workspace tab"
          >
            <Plus className="h-4 w-4" />
          </button>
          
          {/* Tenant Selector Dropdown */}
          {showTenantSelector && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-[10001]">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-900">Open Workspace</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {getAvailableTenantsForNewTab().map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => openNewTab(tenant)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center"
                  >
                    <Building2 className="h-4 w-4 mr-3 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-xs text-gray-500">{tenant.user_role}</div>
                    </div>
                  </button>
                ))}
                {getAvailableTenantsForNewTab().length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    All workspaces are already open
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
      
      {/* Click outside to close dropdown */}
      {showTenantSelector && (
        <div
          className="fixed inset-0 z-[10000]"
          onClick={() => setShowTenantSelector(false)}
        />
      )}
    </div>
  )
}

export default TenantTabs
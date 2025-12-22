import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTenant } from '../contexts/TenantContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Menu, 
  Search, 
  MapPin, 
  User, 
  LogOut, 
  Settings,
  ChevronDown,
  Shield,
  Building2,
  Grid3X3
} from 'lucide-react'

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth()
  const { currentTenant, tenantUser } = useTenant()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showTenantMenu, setShowTenantMenu] = useState(false)

  // Check if user has admin permissions for current tenant
  const hasAdminAccess = tenantUser?.permissions?.some(p => 
    p.name === 'users.manage' || 
    p.name === 'roles.manage' || 
    p.name === 'groups.manage' ||
    p.name === 'system.admin'
  )

  const handleSearch = (e) => {
    e.preventDefault()
    // Implement search functionality
    console.log('Searching for:', searchQuery)
  }

  const handleTenantSwitch = () => {
    navigate('/')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-2">
            <MapPin className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Location Tracker</h1>
              {currentTenant && (
                <p className="text-sm text-gray-500">{currentTenant.name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Search objects, tags, or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="flex items-center space-x-4">
          {/* Tenant Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowTenantMenu(!showTenantMenu)}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Building2 className="h-4 w-4 mr-2" />
              <span className="max-w-32 truncate">
                {currentTenant?.name || 'Select Workspace'}
              </span>
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
            
            {showTenantMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-900">Current Workspace</h3>
                  <p className="text-xs text-gray-500 mt-1">{currentTenant?.name}</p>
                  {tenantUser && (
                    <p className="text-xs text-gray-500">Role: {tenantUser.role}</p>
                  )}
                </div>
                <div className="p-2">
                  <button
                    onClick={handleTenantSwitch}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded-md flex items-center text-sm"
                  >
                    <Grid3X3 className="h-4 w-4 mr-3 text-gray-400" />
                    Switch Workspace
                  </button>
                </div>
              </div>
            )}
          </div>

          {hasAdminAccess && (
            <button
              onClick={() => navigate(location.pathname.includes('/admin') ? `/tenant/${currentTenant?.id}/dashboard` : `/tenant/${currentTenant?.id}/admin`)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname.includes('/admin')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Shield className="h-4 w-4 mr-2" />
              {location.pathname.includes('/admin') ? 'Dashboard' : 'Admin'}
            </button>
          )}
          
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-5 w-5 text-primary-600" />
              </div>
              <span className="hidden md:block text-gray-700">{user?.email}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {showUserMenu && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <button
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                  <button
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    onClick={() => {
                      logout()
                      setShowUserMenu(false)
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Click outside handlers */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
      {showTenantMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowTenantMenu(false)}
        />
      )}
    </nav>
  )
}

export default Navbar
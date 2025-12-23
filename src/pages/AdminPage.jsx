import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTenant } from '../contexts/TenantContext'
import { Navigate } from 'react-router-dom'
import { 
  Users, 
  Shield, 
  UserCheck, 
  Settings,
  Key,
  UsersIcon,
  Building2
} from 'lucide-react'
import RoleManagement from '../components/admin/RoleManagement'
import UserManagement from '../components/admin/UserManagement'
import GroupManagement from '../components/admin/GroupManagement'
import PermissionOverview from '../components/admin/PermissionOverview'
import WorkspaceManagement from '../components/admin/WorkspaceManagement'

const AdminPage = () => {
  const { user } = useAuth()
  const { tenantUser, currentTenant } = useTenant()
  
  // Check if user has admin permissions for current tenant
  const hasAdminAccess = tenantUser?.permissions?.some(p => 
    p.name === 'users.manage' || 
    p.name === 'roles.manage' || 
    p.name === 'groups.manage' ||
    p.name === 'system.admin'
  )

  // Check if user has super admin permissions (system.admin)
  const hasSuperAdminAccess = tenantUser?.permissions?.some(p => p.name === 'system.admin')
  
  // Default tab based on user permissions
  const [activeTab, setActiveTab] = useState(hasSuperAdminAccess ? 'workspaces' : 'users')

  if (!user || !hasAdminAccess) {
    return <Navigate to={`/tenant/${currentTenant?.id}/dashboard`} replace />
  }

  const tabs = [
    {
      id: 'users',
      name: 'Users',
      icon: Users,
      component: UserManagement,
      permission: 'users.manage'
    },
    {
      id: 'roles',
      name: 'Roles',
      icon: Shield,
      component: RoleManagement,
      permission: 'roles.manage'
    },
    {
      id: 'groups',
      name: 'Groups',
      icon: UsersIcon,
      component: GroupManagement,
      permission: 'groups.manage'
    },
    {
      id: 'permissions',
      name: 'Permissions',
      icon: Key,
      component: PermissionOverview,
      permission: 'roles.read'
    },
    {
      id: 'workspaces',
      name: 'Workspaces',
      icon: Building2,
      component: WorkspaceManagement,
      permission: 'system.admin'
    }
  ]

  // Filter tabs based on user permissions
  const availableTabs = tabs.filter(tab => 
    tenantUser?.permissions?.some(p => p.name === tab.permission)
  )

  const ActiveComponent = availableTabs.find(tab => tab.id === activeTab)?.component || UserManagement

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {hasSuperAdminAccess ? 'System Administration' : 'Administration'}
                </h1>
                <p className="text-sm text-gray-500">
                  {hasSuperAdminAccess 
                    ? 'Manage users, roles, permissions, and workspaces across the entire system'
                    : 'Manage users, roles, and permissions'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-600">
                {user.roles?.[0]?.display_name || user.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {availableTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ActiveComponent />
      </div>
    </div>
  )
}

export default AdminPage
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  UserPlus,
  UserMinus,
  Search,
  X
} from 'lucide-react'

const GroupManagement = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)

  // Fetch groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['rbac-groups'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/rbac/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch groups')
      return response.json()
    }
  })

  // Fetch users for group assignment
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch users')
      return response.json()
    }
  })

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData) => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/rbac/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(groupData)
      })
      if (!response.ok) throw new Error('Failed to create group')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-groups'] })
      setShowCreateModal(false)
    }
  })

  // Add user to group mutation
  const addUserToGroupMutation = useMutation({
    mutationFn: async ({ groupId, userId }) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/rbac/groups/${groupId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      })
      if (!response.ok) throw new Error('Failed to add user to group')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-groups'] })
    }
  })

  // Remove user from group mutation
  const removeUserFromGroupMutation = useMutation({
    mutationFn: async ({ groupId, userId }) => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/rbac/groups/${groupId}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to remove user from group')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-groups'] })
    }
  })

  // Filter groups
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateGroup = (formData) => {
    const groupData = {
      name: formData.name,
      displayName: formData.displayName,
      description: formData.description
    }
    createGroupMutation.mutate(groupData)
  }

  const handleAddUserToGroup = (groupId, userId) => {
    addUserToGroupMutation.mutate({ groupId, userId })
  }

  const handleRemoveUserFromGroup = (groupId, userId) => {
    if (confirm('Are you sure you want to remove this user from the group?')) {
      removeUserFromGroupMutation.mutate({ groupId, userId })
    }
  }

  if (groupsLoading) {
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
          <h2 className="text-xl font-semibold text-gray-900">Group Management</h2>
          <p className="text-sm text-gray-600">Organize users into groups for easier management</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{group.display_name}</h3>
                  <p className="text-sm text-gray-500">{group.name}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setEditingGroup(group)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete the group "${group.display_name}"?`)) {
                      // TODO: Implement delete group
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{group.description}</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Members:</span>
                <span className="font-medium">{group.users?.length || 0}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setEditingGroup(group)}
                className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Members
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
          isLoading={createGroupMutation.isPending}
        />
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <EditGroupModal
          group={editingGroup}
          users={users}
          onClose={() => setEditingGroup(null)}
          onAddUser={handleAddUserToGroup}
          onRemoveUser={handleRemoveUserFromGroup}
        />
      )}
    </div>
  )
}

// Create Group Modal Component
const CreateGroupModal = ({ onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create New Group</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., engineering_team"
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
              placeholder="e.g., Engineering Team"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe the group's purpose"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Group Modal Component
const EditGroupModal = ({ group, users, onClose, onAddUser, onRemoveUser }) => {
  const [selectedUserId, setSelectedUserId] = useState('')

  const groupUserIds = group.users?.map(u => u.id) || []
  const availableUsers = users.filter(user => !groupUserIds.includes(user.id))

  const handleAddUser = () => {
    if (selectedUserId) {
      onAddUser(group.id, parseInt(selectedUserId))
      setSelectedUserId('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Manage Group Members</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Group Information</h4>
            <p className="text-sm text-gray-600">{group.display_name}</p>
            <p className="text-xs text-gray-500">{group.description}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current Members</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {group.users?.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{user.email}</span>
                  <button
                    onClick={() => onRemoveUser(group.id, user.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(!group.users || group.users.length === 0) && (
                <p className="text-sm text-gray-500">No members in this group</p>
              )}
            </div>
          </div>

          {availableUsers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Member</h4>
              <div className="flex space-x-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a user</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.email}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddUser}
                  disabled={!selectedUserId}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default GroupManagement
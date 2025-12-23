import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WorkspaceManagement from '../../src/components/admin/WorkspaceManagement.jsx'

// Mock the contexts
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'admin', email: 'admin@test.com' }
  })
}))

vi.mock('../../src/contexts/TenantContext', () => ({
  useTenant: () => ({
    tenantId: 1,
    getApiHeaders: () => ({ 'Authorization': 'Bearer mock-token' })
  })
}))

// Mock fetch
global.fetch = vi.fn()

describe('WorkspaceManagement', () => {
  let queryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceManagement />
      </QueryClientProvider>
    )
  }

  it('should render workspace management interface', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([])
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([])
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Workspace Management')).toBeInTheDocument()
    })
    expect(screen.getByText('Manage all workspaces and their objects across the system')).toBeInTheDocument()
  })

  it('should display workspaces when loaded', async () => {
    const mockWorkspaces = [
      {
        id: 1,
        name: 'Test Workspace',
        created_at: '2023-01-01T00:00:00Z',
        stats: {
          user_count: 5,
          object_count: 10,
          location_history_count: 100
        }
      }
    ]

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWorkspaces)
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([])
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
      expect(screen.getByText('5 users')).toBeInTheDocument()
      expect(screen.getByText('10 objects')).toBeInTheDocument()
    })
  })
})
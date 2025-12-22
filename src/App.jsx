import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { TenantProvider } from './contexts/TenantContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import TenantSelectorPage from './pages/TenantSelectorPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <TenantSelectorPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tenant/:tenantId/*" 
            element={
              <ProtectedRoute>
                <TenantProvider>
                  <Routes>
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="admin" element={<AdminPage />} />
                    <Route path="" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </TenantProvider>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
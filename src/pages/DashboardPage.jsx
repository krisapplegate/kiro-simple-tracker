import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import MapView from '../components/MapView'
import ObjectDrawer from '../components/ObjectDrawer'
import CreateObjectModal from '../components/CreateObjectModal'
import TenantTabs from '../components/TenantTabs'
import { useWebSocket } from '../hooks/useWebSocket'
import { useTenant } from '../contexts/TenantContext'

const DashboardPage = () => {
  const { currentTenant, tenantUser } = useTenant()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedObject, setSelectedObject] = useState(null)
  const [zoomToObject, setZoomToObject] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLocation, setCreateLocation] = useState(null)
  const [filters, setFilters] = useState({
    timeRange: '24h',
    objectTypes: [],
    tags: [],
    proximityRange: 1000
  })

  // Initialize WebSocket connection for real-time updates
  const { isConnected } = useWebSocket()

  const handleMapClick = (latlng) => {
    setCreateLocation(latlng)
    setShowCreateModal(true)
  }

  const handleObjectSelect = (object) => {
    setSelectedObject(object)
    // Trigger zoom to object location
    if (object && object.lat && object.lng) {
      setZoomToObject(object)
      // Clear zoom trigger after a short delay to allow for future zooms to the same object
      setTimeout(() => setZoomToObject(null), 100)
    }
  }

  const handleCloseDrawer = () => {
    setSelectedObject(null)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setCreateLocation(null)
  }

  return (
    <TenantTabs>
      <div className="h-full flex flex-col">
        <Navbar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar 
            open={sidebarOpen}
            filters={filters}
            setFilters={setFilters}
            onObjectSelect={handleObjectSelect}
          />
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setSidebarOpen(false)} />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <Sidebar 
                open={true}
                filters={filters}
                setFilters={setFilters}
                onObjectSelect={handleObjectSelect}
              />
            </div>
          </div>
        )}
        
        <div className="flex-1 relative">
          <MapView 
            filters={filters}
            onMapClick={handleMapClick}
            onObjectSelect={handleObjectSelect}
            selectedObject={selectedObject}
            zoomToObject={zoomToObject}
          />
        </div>
        
        <ObjectDrawer 
          object={selectedObject}
          onClose={handleCloseDrawer}
        />
      </div>
      
      <CreateObjectModal 
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        location={createLocation}
      />
      
      {/* Connection Status Indicator */}
      <div className={`fixed top-20 right-4 px-3 py-1 rounded-full text-xs font-medium z-50 ${
        isConnected 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      </div>
    </TenantTabs>
  )
}

export default DashboardPage
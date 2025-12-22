import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTenant } from '../contexts/TenantContext'
import { 
  Filter, 
  Calendar, 
  Tag, 
  MapPin, 
  Clock,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

const Sidebar = ({ open, filters, setFilters }) => {
  const { tenantId } = useTenant()
  const [expandedSections, setExpandedSections] = useState({
    timeRange: true,
    objectTypes: true,
    tags: false,
    proximity: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ]

  // Fetch existing object types
  const { data: existingTypes = [] } = useQuery({
    queryKey: ['object-types', tenantId],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/objects/types', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) return []
      return response.json()
    },
    enabled: !!tenantId
  })

  // Color mapping for object types
  const typeColors = {
    vehicle: 'bg-blue-500',
    person: 'bg-green-500',
    asset: 'bg-purple-500',
    device: 'bg-orange-500',
    equipment: 'bg-yellow-500',
    drone: 'bg-indigo-500',
    sensor: 'bg-pink-500',
    default: 'bg-gray-500'
  }

  // Transform existing types for display
  const objectTypes = existingTypes.map(type => ({
    id: type.name,
    name: type.name.charAt(0).toUpperCase() + type.name.slice(1) + 's',
    count: type.count,
    color: typeColors[type.name] || typeColors.default
  }))

  // Fetch existing tags
  const { data: existingTags = [] } = useQuery({
    queryKey: ['object-tags', tenantId],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/objects/tags', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) return []
      return response.json()
    },
    enabled: !!tenantId
  })

  // Use existing tags or fallback to default suggestions
  const popularTags = existingTags.length > 0 
    ? existingTags.map(tag => tag.name)
    : ['urgent', 'maintenance', 'delivery', 'patrol', 'emergency']

  const handleTimeRangeChange = (value) => {
    setFilters(prev => ({ ...prev, timeRange: value }))
  }

  const handleObjectTypeToggle = (typeId) => {
    setFilters(prev => ({
      ...prev,
      objectTypes: prev.objectTypes.includes(typeId)
        ? prev.objectTypes.filter(id => id !== typeId)
        : [...prev.objectTypes, typeId]
    }))
  }

  const handleTagToggle = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const handleProximityChange = (value) => {
    setFilters(prev => ({ ...prev, proximityRange: value }))
  }

  if (!open) return null

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Time Range Filter */}
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={() => toggleSection('timeRange')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span className="font-medium text-gray-900">Time Range</span>
            </div>
            {expandedSections.timeRange ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.timeRange && (
            <div className="mt-3 space-y-2">
              {timeRangeOptions.map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name="timeRange"
                    value={option.value}
                    checked={filters.timeRange === option.value}
                    onChange={(e) => handleTimeRangeChange(e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Object Types Filter */}
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={() => toggleSection('objectTypes')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
              <span className="font-medium text-gray-900">Object Types</span>
            </div>
            {expandedSections.objectTypes ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.objectTypes && (
            <div className="mt-3 space-y-2">
              {objectTypes.map(type => (
                <label key={type.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.objectTypes.includes(type.id)}
                      onChange={() => handleObjectTypeToggle(type.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <div className={`ml-2 w-3 h-3 rounded-full ${type.color}`}></div>
                    <span className="ml-2 text-sm text-gray-700">{type.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {type.count}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Tags Filter */}
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={() => toggleSection('tags')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center">
              <Tag className="h-4 w-4 mr-2 text-gray-500" />
              <span className="font-medium text-gray-900">Tags</span>
            </div>
            {expandedSections.tags ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.tags && (
            <div className="mt-3">
              {existingTags.length > 0 ? (
                <div className="space-y-2">
                  {existingTags.slice(0, 10).map(tag => (
                    <label key={tag.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.tags.includes(tag.name)}
                          onChange={() => handleTagToggle(tag.name)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{tag.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {tag.count}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {popularTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 text-xs rounded-full border ${
                        filters.tags.includes(tag)
                          ? 'bg-primary-100 border-primary-300 text-primary-700'
                          : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Proximity Filter */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('proximity')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
              <span className="font-medium text-gray-900">Proximity Range</span>
            </div>
            {expandedSections.proximity ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.proximity && (
            <div className="mt-3">
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={filters.proximityRange}
                onChange={(e) => handleProximityChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>100m</span>
                <span>{filters.proximityRange}m</span>
                <span>10km</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
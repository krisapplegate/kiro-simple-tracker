import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTenant } from '../contexts/TenantContext'

export const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const ws = useRef(null)
  const queryClient = useQueryClient()
  const { tenantId } = useTenant()

  useEffect(() => {
    if (!tenantId) return

    const wsUrl = url || `ws://localhost:3001`
    
    const connect = () => {
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log(`WebSocket connected for tenant ${tenantId}`)
        setIsConnected(true)
        
        // Send tenant identification
        if (ws.current) {
          ws.current.send(JSON.stringify({
            type: 'join_tenant',
            tenantId: tenantId
          }))
        }
      }

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          // Only process messages for current tenant
          if (message.tenantId && message.tenantId !== tenantId) {
            return
          }
          
          setLastMessage(message)
          
          // Handle different message types
          switch (message.type) {
            case 'location_update':
              // Invalidate objects query to refresh the map
              queryClient.invalidateQueries(['objects', tenantId])
              break
            case 'object_created':
              // Invalidate objects query to show new object
              queryClient.invalidateQueries(['objects', tenantId])
              queryClient.invalidateQueries(['objectTypes', tenantId])
              break
            case 'object_deleted':
              // Invalidate objects query to remove deleted object
              queryClient.invalidateQueries(['objects', tenantId])
              queryClient.invalidateQueries(['objectTypes', tenantId])
              break
            default:
              console.log('Received message:', message)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.current.onclose = () => {
        console.log(`WebSocket disconnected for tenant ${tenantId}`)
        setIsConnected(false)
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (ws.current?.readyState === WebSocket.CLOSED) {
            connect()
          }
        }, 3000)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    }

    connect()

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [url, queryClient, tenantId])

  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        ...message,
        tenantId: tenantId
      }))
    }
  }

  return {
    isConnected,
    lastMessage,
    sendMessage
  }
}
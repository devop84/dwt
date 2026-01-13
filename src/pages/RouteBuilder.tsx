import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { routesApi } from '../lib/api'
import type { Route } from '../types'

export function RouteBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<Route | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id && id !== 'new') {
      loadRoute()
    } else {
      setLoading(false)
    }
  }, [id])

  const loadRoute = async () => {
    try {
      setLoading(true)
      const data = await routesApi.getById(id!)
      setRoute(data)
    } catch (err: any) {
      console.error('Error loading route:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Route Builder</h1>
      <p>Route builder interface coming soon...</p>
      {route && <p>Editing: {route.name}</p>}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { routesApi } from '../lib/api'

export function RouteDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadRoute()
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

  if (!route) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <p>Route not found</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1>{route.name}</h1>
      <p>Status: {route.status}</p>
      <p>Route details coming soon...</p>
    </div>
  )
}

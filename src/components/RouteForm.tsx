import { useState, useEffect, FormEvent } from 'react'
import type { Route } from '../types'

interface RouteFormProps {
  route?: Route | null
  onClose: () => void
  onSave: (route: Omit<Route, 'id' | 'endDate' | 'duration' | 'totalDistance' | 'createdAt' | 'updatedAt'>) => Promise<void>
}

export function RouteForm({ route, onClose, onSave }: RouteFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    status: 'draft' as Route['status'],
    currency: 'BRL',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (route) {
      setFormData({
        name: route.name || '',
        description: route.description || '',
        startDate: route.startDate ? route.startDate.split('T')[0] : '',
        status: route.status,
        currency: route.currency,
        notes: route.notes || '',
      })
    }
  }, [route])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    setLoading(true)
    try {
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        startDate: formData.startDate || null,
        status: formData.status,
        estimatedCost: route?.estimatedCost || 0,
        actualCost: route?.actualCost || 0,
        currency: formData.currency,
        notes: formData.notes.trim() || null,
      })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save route')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '2rem',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            {route ? 'Edit Route' : 'Create Route'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              lineHeight: 1,
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#111827'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '0.375rem',
            color: '#991b1b'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="startDate" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="status" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                color: '#111827',
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
            >
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="notes" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s, border-color 0.2s'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'white',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? 'Saving...' : (route ? 'Update Route' : 'Create Route')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

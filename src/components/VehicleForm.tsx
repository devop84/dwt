import { useState, useEffect, FormEvent } from 'react'
import { vehiclesApi } from '../lib/api'
import type { Vehicle, Destination, ThirdParty } from '../types'

interface VehicleFormProps {
  vehicle?: Vehicle | null
  destinations: Destination[]
  thirdParties: ThirdParty[]
  onClose: () => void
  onSave: () => Promise<void>
}

export function VehicleForm({ vehicle, destinations, thirdParties, onClose, onSave }: VehicleFormProps) {
  const [formData, setFormData] = useState({
    type: '' as Vehicle['type'] | '',
    vehicleOwner: '' as Vehicle['vehicleOwner'] | '',
    destinationId: '',
    thirdPartyId: '',
    note: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (vehicle) {
      setFormData({
        type: vehicle.type || '',
        vehicleOwner: vehicle.vehicleOwner || '',
        destinationId: vehicle.destinationId || '',
        thirdPartyId: vehicle.thirdPartyId || '',
        note: vehicle.note || '',
      })
    }
  }, [vehicle])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.type) {
      setError('Vehicle type is required')
      return
    }

    if (!formData.vehicleOwner) {
      setError('Vehicle owner is required')
      return
    }

    if (formData.vehicleOwner === 'third-party' && !formData.thirdPartyId) {
      setError('Third party is required when vehicle owner is third-party')
      return
    }

    setLoading(true)
    try {
      if (vehicle) {
        await vehiclesApi.update(vehicle.id, {
          type: formData.type as Vehicle['type'],
          vehicleOwner: formData.vehicleOwner as Vehicle['vehicleOwner'],
          destinationId: formData.destinationId || null,
          thirdPartyId: formData.vehicleOwner === 'third-party' ? formData.thirdPartyId : null,
          note: formData.note.trim() || null,
        })
      } else {
        await vehiclesApi.create({
          type: formData.type as Vehicle['type'],
          vehicleOwner: formData.vehicleOwner as Vehicle['vehicleOwner'],
          destinationId: formData.destinationId || null,
          thirdPartyId: formData.vehicleOwner === 'third-party' ? formData.thirdPartyId : null,
          note: formData.note.trim() || null,
        })
      }
      await onSave()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save vehicle')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      // Clear thirdPartyId if owner changes to company
      if (field === 'vehicleOwner' && value === 'company') {
        updated.thirdPartyId = ''
      }
      return updated
    })
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151'
  }

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
          {vehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        </h2>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="type" style={labelStyle}>
              Vehicle Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select id="type" value={formData.type} onChange={(e) => handleChange('type', e.target.value)} required style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)' }} onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none' }}>
              <option value="">Select a vehicle type</option>
              <option value="car4x4">Car 4x4</option>
              <option value="boat">Boat</option>
              <option value="quadbike">Quadbike</option>
              <option value="carSedan">Car Sedan</option>
              <option value="outro">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="vehicleOwner" style={labelStyle}>
              Vehicle Owner <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select id="vehicleOwner" value={formData.vehicleOwner} onChange={(e) => handleChange('vehicleOwner', e.target.value)} required style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)' }} onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none' }}>
              <option value="">Select owner type</option>
              <option value="company">Company Vehicle</option>
              <option value="third-party">Third Party Vehicle</option>
            </select>
          </div>

          {formData.vehicleOwner === 'third-party' && (
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="thirdPartyId" style={labelStyle}>
                Third Party <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select id="thirdPartyId" value={formData.thirdPartyId} onChange={(e) => handleChange('thirdPartyId', e.target.value)} required={formData.vehicleOwner === 'third-party'} style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)' }} onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none' }}>
                <option value="">Select a third party</option>
                {thirdParties.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="destinationId" style={labelStyle}>
              Destination
            </label>
            <select id="destinationId" value={formData.destinationId} onChange={(e) => handleChange('destinationId', e.target.value)} style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)' }} onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none' }}>
              <option value="">Select a destination (optional)</option>
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="note" style={labelStyle}>
              Note
            </label>
            <textarea id="note" value={formData.note} onChange={(e) => handleChange('note', e.target.value)} rows={4} placeholder="Additional information about this vehicle..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)' }} onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s, border-color 0.2s' }} onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#f9fafb' }} onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'white' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '500', color: 'white', backgroundColor: loading ? '#9ca3af' : '#3b82f6', border: 'none', borderRadius: '0.375rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#2563eb' }} onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#3b82f6' }}>
              {loading ? 'Saving...' : vehicle ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

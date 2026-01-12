import { useState, useEffect, FormEvent } from 'react'
import { bankAccountsApi } from '../lib/api'
import type { BankAccount, EntityType } from '../types'

interface BankAccountFormProps {
  account?: BankAccount | null
  entityType: EntityType
  entityId: string
  onClose: () => void
  onSave: () => Promise<void>
}

export function BankAccountForm({ account, entityType, entityId, onClose, onSave }: BankAccountFormProps) {
  const [formData, setFormData] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    iban: '',
    swiftBic: '',
    routingNumber: '',
    currency: '',
    isPrimary: false,
    note: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (account) {
      setFormData({
        accountHolderName: account.accountHolderName || '',
        bankName: account.bankName || '',
        accountNumber: account.accountNumber || '',
        iban: account.iban || '',
        swiftBic: account.swiftBic || '',
        routingNumber: account.routingNumber || '',
        currency: account.currency || '',
        isPrimary: account.isPrimary || false,
        note: account.note || '',
      })
    }
  }, [account])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.accountHolderName.trim()) {
      setError('Account holder name is required')
      return
    }

    if (!formData.bankName.trim()) {
      setError('Bank name is required')
      return
    }

    setLoading(true)
    try {
      if (account) {
        await bankAccountsApi.update(account.id, {
          entityType,
          entityId,
          accountHolderName: formData.accountHolderName.trim(),
          bankName: formData.bankName.trim(),
          accountNumber: formData.accountNumber.trim() || null,
          iban: formData.iban.trim() || null,
          swiftBic: formData.swiftBic.trim() || null,
          routingNumber: formData.routingNumber.trim() || null,
          currency: formData.currency.trim() || null,
          isPrimary: formData.isPrimary,
          note: formData.note.trim() || null,
        })
      } else {
        await bankAccountsApi.create({
          entityType,
          entityId,
          accountHolderName: formData.accountHolderName.trim(),
          bankName: formData.bankName.trim(),
          accountNumber: formData.accountNumber.trim() || null,
          iban: formData.iban.trim() || null,
          swiftBic: formData.swiftBic.trim() || null,
          routingNumber: formData.routingNumber.trim() || null,
          currency: formData.currency.trim() || null,
          isPrimary: formData.isPrimary,
          note: formData.note.trim() || null,
        })
      }
      await onSave()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save bank account')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '1.5rem'
        }}>
          {account ? 'Edit Bank Account' : 'Add Bank Account'}
        </h2>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="accountHolderName" style={labelStyle}>
              Account Holder Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="accountHolderName"
              type="text"
              value={formData.accountHolderName}
              onChange={(e) => handleChange('accountHolderName', e.target.value)}
              required
              style={inputStyle}
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
            <label htmlFor="bankName" style={labelStyle}>
              Bank Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="bankName"
              type="text"
              value={formData.bankName}
              onChange={(e) => handleChange('bankName', e.target.value)}
              required
              style={inputStyle}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="accountNumber" style={labelStyle}>
                Account Number
              </label>
              <input
                id="accountNumber"
                type="text"
                value={formData.accountNumber}
                onChange={(e) => handleChange('accountNumber', e.target.value)}
                style={inputStyle}
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
            <div>
              <label htmlFor="currency" style={labelStyle}>
                Currency
              </label>
              <input
                id="currency"
                type="text"
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                placeholder="e.g., BRL, USD, EUR"
                style={inputStyle}
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
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="iban" style={labelStyle}>
              IBAN
            </label>
            <input
              id="iban"
              type="text"
              value={formData.iban}
              onChange={(e) => handleChange('iban', e.target.value)}
              style={inputStyle}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="swiftBic" style={labelStyle}>
                SWIFT/BIC
              </label>
              <input
                id="swiftBic"
                type="text"
                value={formData.swiftBic}
                onChange={(e) => handleChange('swiftBic', e.target.value)}
                style={inputStyle}
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
            <div>
              <label htmlFor="routingNumber" style={labelStyle}>
                Routing Number
              </label>
              <input
                id="routingNumber"
                type="text"
                value={formData.routingNumber}
                onChange={(e) => handleChange('routingNumber', e.target.value)}
                style={inputStyle}
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
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.isPrimary}
                onChange={(e) => handleChange('isPrimary', e.target.checked)}
                style={{
                  width: '1rem',
                  height: '1rem',
                  cursor: 'pointer'
                }}
              />
              <span style={labelStyle}>Set as primary account</span>
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="note" style={labelStyle}>
              Note
            </label>
            <textarea
              id="note"
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              rows={3}
              placeholder="Additional information about this bank account..."
              style={{
                ...inputStyle,
                resize: 'vertical',
                fontFamily: 'inherit'
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

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}>
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
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'white'
                }
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
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#2563eb'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#3b82f6'
                }
              }}
            >
              {loading ? 'Saving...' : account ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

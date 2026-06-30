import { useState, useEffect } from 'react'
import TimePicker from './TimePicker'
import DaySelector from './DaySelector'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function MedicineFormModal({ isOpen, onClose, onSaved, editingMedicine, userId }) {
  const [name,           setName]           = useState('')
  const [dosage,         setDosage]         = useState('')
  const [times,          setTimes]          = useState(['08:00'])
  const [days,           setDays]           = useState(['daily'])
  const [remindFamily,   setRemindFamily]   = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Pre-fill when editing
  useEffect(() => {
    if (editingMedicine) {
      setName(editingMedicine.name || '')
      setDosage(editingMedicine.dosage || '')
      setTimes(editingMedicine.times?.length ? editingMedicine.times : ['08:00'])
      setDays(editingMedicine.days?.length ? editingMedicine.days : ['daily'])
      setRemindFamily(editingMedicine.remind_family !== false)
    } else {
      setName(''); setDosage(''); setTimes(['08:00']); setDays(['daily']); setRemindFamily(true)
    }
    setError(null)
    setShowDeleteConfirm(false)
  }, [editingMedicine, isOpen])

  if (!isOpen) return null

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true); setError(null)
    try {
      const body = {
        elder_id:      userId,
        name:          name.trim(),
        dosage:        dosage.trim(),
        times,
        days,
        remind_family: remindFamily,
      }

      const url = editingMedicine
        ? `${API_URL}/api/medicine/update/${editingMedicine.id}`
        : `${API_URL}/api/medicine/add`
      const method = editingMedicine ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Save failed')
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingMedicine) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/api/medicine/delete/${editingMedicine.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Delete failed')
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message || 'Could not delete. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center', zIndex: 500,
        padding: '0',
      }}
    >
      {/* Sheet */}
      <div style={{
        background: 'white',
        borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 480,
        maxHeight: '92dvh',
        overflowY: 'auto',
        padding: '24px 20px 40px',
        fontFamily: 'Noto Sans, sans-serif',
      }}>

        {/* Handle bar */}
        <div style={{ width: 40, height: 4, background: '#DDE8F5', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#0A2540', margin: 0 }}>
            {editingMedicine ? 'Edit Medicine' : 'Add Medicine'}
          </p>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '1.5px solid #DDE8F5', background: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 15, color: '#5A7A9A' }} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Medicine Name
            </p>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Metformin"
              style={{
                width: '100%', height: 52, borderRadius: 12,
                border: '1.5px solid #DDE8F5', padding: '0 14px',
                fontSize: 16, color: '#0A2540', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Dosage */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#5A7A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Dosage <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </p>
            <input
              value={dosage}
              onChange={e => setDosage(e.target.value)}
              placeholder="e.g. 500mg, 1 tablet"
              style={{
                width: '100%', height: 48, borderRadius: 12,
                border: '1.5px solid #DDE8F5', padding: '0 14px',
                fontSize: 15, color: '#0A2540', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <TimePicker times={times} onChange={setTimes} />
          <DaySelector selected={days} onChange={setDays} />

          {/* Notify family toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#F7FBFF', borderRadius: 12, padding: '14px 16px',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: '0 0 2px' }}>
                Notify Family if Missed
              </p>
              <p style={{ fontSize: 11, color: '#A0B8D0', margin: 0 }}>
                Alert family if not marked taken within 30 minutes
              </p>
            </div>
            <button
              onClick={() => setRemindFamily(v => !v)}
              style={{
                width: 44, height: 26, borderRadius: 13,
                background: remindFamily ? '#1D9E75' : '#DDE8F5',
                border: 'none', cursor: 'pointer', position: 'relative',
                flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: remindFamily ? 21 : 3,
                width: 20, height: 20, borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FFF4F4', border: '1px solid #FECACA',
              borderRadius: 10, padding: '10px 14px',
              color: '#E24B4A', fontSize: 13, fontWeight: 600,
            }}>
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{
              width: '100%', height: 52, borderRadius: 14,
              background: !name.trim() || saving ? '#A0B8D0' : '#1D9E75',
              border: 'none', color: 'white',
              fontSize: 17, fontWeight: 700, cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Save Medicine'}
          </button>

          {/* Delete (edit mode) */}
          {editingMedicine && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: '100%', height: 44, borderRadius: 12,
                border: '1.5px solid #E24B4A', background: 'white',
                color: '#E24B4A', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <i className="ti ti-trash" style={{ marginRight: 6 }} />
              Delete Medicine
            </button>
          )}

          {/* Delete confirm */}
          {showDeleteConfirm && (
            <div style={{
              background: '#FFF0F0', border: '1.5px solid #FECACA',
              borderRadius: 12, padding: 16, textAlign: 'center',
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#E24B4A', marginBottom: 4 }}>
                Remove this medicine?
              </p>
              <p style={{ fontSize: 12, color: '#5A7A9A', marginBottom: 14 }}>
                You can always add it back later.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1, height: 40, borderRadius: 10,
                    border: '1.5px solid #DDE8F5', background: 'white',
                    color: '#5A7A9A', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  style={{
                    flex: 1, height: 40, borderRadius: 10,
                    border: 'none', background: '#E24B4A',
                    color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {saving ? 'Removing…' : 'Yes, Remove'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

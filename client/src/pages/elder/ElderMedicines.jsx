import { useState, useEffect, useCallback } from 'react'
import ElderLayout from '../../components/layout/ElderLayout'
import MedicineFormModal from '../../components/medicine/MedicineFormModal'
import MedicineInfoCard from '../../components/medicine/MedicineInfoCard'
import DoseCard from '../../components/medicine/DoseCard'
import AdherenceCard from '../../components/medicine/AdherenceCard'
import { useMedicineNotifications } from '../../hooks/useMedicineNotifications'
import { supabase } from '../../lib/supabase'
import { MEDICINE_CATEGORIES, getCategory } from '../../lib/medicineCategories'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

// Group medicines by category, preserving the defined category order.
// Anything without a recognized category falls into "Other".
function groupByCategory(medicines) {
  const groups = {}
  for (const med of medicines) {
    const cat = getCategory(med.category)
    if (!groups[cat.id]) groups[cat.id] = { ...cat, medicines: [] }
    groups[cat.id].medicines.push(med)
  }
  return MEDICINE_CATEGORIES
    .map(c => groups[c.id])
    .filter(Boolean)
}

export default function ElderMedicines() {
  const [userId,        setUserId]        = useState(null)
  const [medicines,     setMedicines]     = useState([])
  const [schedule,      setSchedule]      = useState([])
  const [adherence,     setAdherence]     = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editing,       setEditing]       = useState(null)
  const [infoMed,       setInfoMed]       = useState(null)
  const [toast,         setToast]         = useState(null)
  const [skipConfirm,   setSkipConfirm]   = useState(null) // log_id to confirm skip

  // Browser notifications for pending doses
  useMedicineNotifications(userId, schedule)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUserId(session.user.id)
    })
  }, [])

  const loadAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [listRes, todayRes, adhRes] = await Promise.all([
        fetch(`${API_URL}/api/medicine/list/${userId}`).then(r => r.json()),
        fetch(`${API_URL}/api/medicine/today/${userId}`).then(r => r.json()),
        fetch(`${API_URL}/api/medicine/adherence/${userId}?days=7`).then(r => r.json()),
      ])
      setMedicines(listRes.medicines || [])
      setSchedule(todayRes.schedule || [])
      setAdherence(adhRes.success ? adhRes : null)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { loadAll() }, [loadAll])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  async function handleMarkTaken(logId) {
    // Optimistic update
    setSchedule(prev => prev.map(d =>
      d.log_id === logId ? { ...d, status: 'taken', taken_at: new Date().toISOString() } : d
    ))
    showToast('Marked as taken!')
    try {
      await fetch(`${API_URL}/api/medicine/mark/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'taken' }),
      })
      // Refresh adherence silently
      fetch(`${API_URL}/api/medicine/adherence/${userId}?days=7`)
        .then(r => r.json()).then(d => { if (d.success) setAdherence(d) })
    } catch {
      // Revert on failure
      loadAll()
    }
  }

  async function handleConfirmSkip(logId) {
    setSkipConfirm(null)
    setSchedule(prev => prev.map(d =>
      d.log_id === logId ? { ...d, status: 'skipped' } : d
    ))
    try {
      await fetch(`${API_URL}/api/medicine/mark/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped' }),
      })
    } catch { loadAll() }
  }

  function openAdd() { setEditing(null); setModalOpen(true) }
  function openEdit(med) { setInfoMed(null); setEditing(med); setModalOpen(true) }

  if (loading) return (
    <ElderLayout>
      <div style={{ textAlign: 'center', padding: 64, color: '#A0B8D0' }}>
        <i className="ti ti-loader-2" style={{ fontSize: 32, display: 'block', marginBottom: 12 }} />
        Loading…
      </div>
    </ElderLayout>
  )

  const categoryGroups = groupByCategory(medicines)

  return (
    <ElderLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A2540', margin: 0 }}>My Medicines</h1>
          <p style={{ fontSize: 13, color: '#A0B8D0', margin: '4px 0 0' }}>
            Today's schedule and reminders
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 40, padding: '0 16px', borderRadius: 12,
            background: '#1D9E75', border: 'none', color: 'white',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 16 }} />Add
        </button>
      </div>

      {/* Adherence */}
      {adherence && <AdherenceCard adherence={adherence} />}

      {/* Today's Schedule */}
      <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>
        Today's Schedule
      </p>

      {schedule.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: '#EBF4FF', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <i className="ti ti-pill" style={{ fontSize: 32, color: '#185FA5' }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 8 }}>
            No medicines added yet
          </p>
          <p style={{ fontSize: 14, color: '#A0B8D0', marginBottom: 24 }}>
            Add your first medicine to get reminders
          </p>
          <button
            onClick={openAdd}
            style={{
              height: 48, padding: '0 28px', borderRadius: 12,
              background: '#1D9E75', border: 'none', color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <i className="ti ti-plus" style={{ marginRight: 6 }} />Add Medicine
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 28 }}>
          {schedule.map(dose => (
            <DoseCard
              key={dose.log_id || `${dose.medicine_id}_${dose.time}`}
              dose={dose}
              onMarkTaken={handleMarkTaken}
              onMarkSkipped={logId => setSkipConfirm(logId)}
            />
          ))}
        </div>
      )}

      {/* All Medicines — grouped by health problem */}
      {medicines.length > 0 && (
        <>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 12 }}>
            All Medicines
          </p>

          {categoryGroups.map(group => (
            <div key={group.id} style={{ marginBottom: 20 }}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: `${group.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`ti ${group.icon}`} style={{ fontSize: 14, color: group.color }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', margin: 0 }}>
                  {group.label}
                </p>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#7B93AC',
                  background: '#EEF4FB', borderRadius: 10, padding: '1px 8px',
                }}>
                  {group.medicines.length}
                </span>
              </div>

              {/* Medicines in this category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.medicines.map(med => (
                  <div
                    key={med.id}
                    onClick={() => setInfoMed(med)}
                    style={{
                      background: 'white', border: '1.5px solid #DDE8F5',
                      borderLeft: `4px solid ${group.color}`,
                      borderRadius: 12, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: `${group.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`ti ${med.icon || group.icon}`} style={{ fontSize: 18, color: group.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', margin: 0 }}>{med.name}</p>
                      <p style={{ fontSize: 12, color: '#A0B8D0', margin: '2px 0 0' }}>
                        {(med.times || []).map(t => formatTime(t)).join(', ')}
                        {med.dosage ? ` · ${med.dosage}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(med) }}
                      style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        border: '1.5px solid #DDE8F5', background: 'white',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <i className="ti ti-edit" style={{ fontSize: 15, color: '#5A7A9A' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p style={{ fontSize: 11, color: '#A0B8D0', textAlign: 'center', lineHeight: 1.6, paddingBottom: 16 }}>
            Medicine info is informational only. Always follow your doctor's or pharmacist's instructions.
          </p>
        </>
      )}

      {/* Skip confirm dialog */}
      {skipConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 450, padding: 24,
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 28,
            width: '100%', maxWidth: 320, textAlign: 'center',
          }}>
            <i className="ti ti-clock-off" style={{ fontSize: 32, color: '#BA7517', display: 'block', marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>Skip this dose?</p>
            <p style={{ fontSize: 13, color: '#5A7A9A', marginBottom: 24 }}>
              This dose will be marked as skipped.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setSkipConfirm(null)}
                style={{
                  flex: 1, height: 44, borderRadius: 10,
                  border: '1.5px solid #DDE8F5', background: 'white',
                  color: '#5A7A9A', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmSkip(skipConfirm)}
                style={{
                  flex: 1, height: 44, borderRadius: 10,
                  border: 'none', background: '#BA7517',
                  color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}
              >
                Yes, Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: '#1D9E75', color: 'white', borderRadius: 24,
          padding: '10px 20px', fontSize: 13, fontWeight: 600, zIndex: 500,
          whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          <i className="ti ti-check" style={{ marginRight: 6 }} />{toast}
        </div>
      )}

      {/* Medicine info bottom sheet */}
      {infoMed && (
        <MedicineInfoCard
          medicine={infoMed}
          onEdit={() => openEdit(infoMed)}
          onClose={() => setInfoMed(null)}
        />
      )}

      {/* Add/Edit modal */}
      <MedicineFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadAll}
        editingMedicine={editing}
        userId={userId}
      />
    </ElderLayout>
  )
}
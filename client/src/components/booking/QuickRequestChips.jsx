import { useState } from 'react'

const CHIPS = [
  {
    label_en: 'Book Maid Tomorrow Morning',
    label_hi: 'kal subah ek maid chahiye',
    label_pa: 'kal savere ek maid chahidi hai',
    request_en: 'I need a maid tomorrow morning',
    request_hi: 'kal subah ek maid chahiye',
    request_pa: 'kal savere ek maid chahidi hai',
  },
  {
    label_en: 'Book Maid Today',
    label_hi: 'aaj ek maid chahiye',
    label_pa: 'ajj ek maid chahidi hai',
    request_en: 'I need a maid today',
    request_hi: 'aaj ek maid chahiye',
    request_pa: 'ajj ek maid chahidi hai',
  },
  {
    label_en: 'Book Nurse Tomorrow',
    label_hi: 'kal ek nurse chahiye',
    label_pa: 'kal ek nurse chahida hai',
    request_en: 'I need a nurse tomorrow',
    request_hi: 'kal ek nurse chahiye',
    request_pa: 'kal ek nurse chahida hai',
  },
  {
    label_en: 'Urgent Nurse Now',
    label_hi: 'abhi turant ek nurse chahiye',
    label_pa: 'hune foran ek nurse chahida hai',
    request_en: 'I urgently need a nurse right now',
    request_hi: 'abhi turant ek nurse chahiye',
    request_pa: 'hune foran ek nurse chahida hai',
  },
  {
    label_en: 'Book Driver for Hospital',
    label_hi: 'hospital ke liye driver chahiye',
    label_pa: 'hospital lyi driver chahida hai',
    request_en: 'I need a driver to go to hospital',
    request_hi: 'hospital ke liye driver chahiye',
    request_pa: 'hospital lyi driver chahida hai',
  },
  {
    label_en: 'Book Cook Tomorrow Morning',
    label_hi: 'kal subah ek cook chahiye',
    label_pa: 'kal savere ek rasoia chahida hai',
    request_en: 'I need a cook tomorrow morning',
    request_hi: 'kal subah ek cook chahiye',
    request_pa: 'kal savere ek rasoia chahida hai',
  },
]

function getLabel(chip, lang) {
  if (lang === 'en-IN') return chip.label_en
  if (lang === 'pa-IN') return chip.label_pa
  return chip.label_hi
}

function getRequest(chip, lang) {
  if (lang === 'en-IN') return chip.request_en
  if (lang === 'pa-IN') return chip.request_pa
  return chip.request_hi
}

export default function QuickRequestChips({ onSelect, language = 'hi-IN' }) {
  const [selectedIdx, setSelectedIdx] = useState(null)

  function handleClick(chip, i) {
    setSelectedIdx(i === selectedIdx ? null : i)
    onSelect(getRequest(chip, language))
  }

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: 13, color: '#5A7A9A', margin: '0 0 10px 0', fontFamily: 'Noto Sans, sans-serif' }}>
        Or choose quickly:
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CHIPS.map((chip, i) => {
          const active = selectedIdx === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(chip, i)}
              style={{
                background: active ? '#1D9E75' : '#fff',
                border: `1.5px solid ${active ? '#1D9E75' : '#DDE8F5'}`,
                borderRadius: 30,
                padding: '0 14px',
                minHeight: 40,
                fontSize: 12,
                fontWeight: 700,
                color: active ? '#fff' : '#185FA5',
                cursor: 'pointer',
                fontFamily: 'Noto Sans, sans-serif',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.borderColor = '#1D9E75'
                  e.currentTarget.style.color = '#1D9E75'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.borderColor = '#DDE8F5'
                  e.currentTarget.style.color = '#185FA5'
                }
              }}
            >
              {getLabel(chip, language)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const CHIPS = [
  {
    label_en: 'Book Maid Tomorrow Morning',
    label_hi: 'kal subah ek maid chahiye',
    request_en: 'I need a maid tomorrow morning',
    request_hi: 'kal subah ek maid chahiye',
  },
  {
    label_en: 'Book Maid Today',
    label_hi: 'aaj ek maid chahiye',
    request_en: 'I need a maid today',
    request_hi: 'aaj ek maid chahiye',
  },
  {
    label_en: 'Book Nurse Tomorrow',
    label_hi: 'kal ek nurse chahiye',
    request_en: 'I need a nurse tomorrow',
    request_hi: 'kal ek nurse chahiye',
  },
  {
    label_en: 'Urgent Nurse Now',
    label_hi: 'abhi turant ek nurse chahiye',
    request_en: 'I urgently need a nurse right now',
    request_hi: 'abhi turant ek nurse chahiye',
  },
  {
    label_en: 'Book Driver for Hospital',
    label_hi: 'hospital ke liye driver chahiye',
    request_en: 'I need a driver to go to hospital',
    request_hi: 'hospital ke liye driver chahiye',
  },
  {
    label_en: 'Book Cook Tomorrow Morning',
    label_hi: 'kal subah ek cook chahiye',
    request_en: 'I need a cook tomorrow morning',
    request_hi: 'kal subah ek cook chahiye',
  },
]

export default function QuickRequestChips({ onSelect, language = 'hi-IN' }) {
  const isHindi = language !== 'en-IN'

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{
        fontSize: 13,
        color: '#5A7A9A',
        margin: '0 0 10px 0',
        fontFamily: 'Noto Sans, sans-serif',
      }}>
        Or choose quickly:
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CHIPS.map((chip, i) => (
          <button
            key={i}
            onClick={() => onSelect(isHindi ? chip.request_hi : chip.request_en)}
            style={{
              background: '#fff',
              border: '1.5px solid #DDE8F5',
              borderRadius: 30,
              padding: '0 14px',
              minHeight: 40,
              fontSize: 12,
              fontWeight: 700,
              color: '#185FA5',
              cursor: 'pointer',
              fontFamily: 'Noto Sans, sans-serif',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#1D9E75'
              e.currentTarget.style.color = '#1D9E75'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#DDE8F5'
              e.currentTarget.style.color = '#185FA5'
            }}
          >
            {isHindi ? chip.label_hi : chip.label_en}
          </button>
        ))}
      </div>
    </div>
  )
}

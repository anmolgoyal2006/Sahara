const CHIPS = {
  hi: [
    { label: 'मुझे मैड चाहिए',            text: 'mujhe maid chahiye' },
    { label: 'मैं ठीक नहीं हूं',           text: 'main theek nahin hoon' },
    { label: 'मुझे नर्स चाहिए',            text: 'mujhe nurse chahiye' },
    { label: 'परिवार को बुलाओ',           text: 'family ko bulao' },
    { label: 'दवाई याद दिलाओ',            text: 'medicine yaad dilao' },
    { label: 'बात करो मेरे साथ',           text: 'baat karo mere saath' },
    { label: 'मेरी सेहत कैसी है',          text: 'meri sehat kaisi hai' },
    { label: 'मुझे खाना बनाने वाला चाहिए', text: 'mujhe cook chahiye' },
  ],
  en: [
    { label: 'Book a maid',         text: 'Book a maid' },
    { label: "I'm not feeling well", text: "I'm not feeling well" },
    { label: 'Book a nurse',        text: 'Book a nurse' },
    { label: 'Call my family',      text: 'Call my family' },
    { label: 'Medicine reminder',   text: 'Medicine reminder' },
    { label: 'Talk to me',          text: 'Talk to me' },
    { label: "How's my health?",    text: "How's my health?" },
    { label: 'Book a cook',         text: 'Book a cook' },
  ],
  pa: [
    { label: 'ਮੈਨੂੰ ਮੈਡ ਚਾਹੀਦੀ',       text: 'mujhe maid chahiye' },
    { label: 'ਮੈਂ ਠੀਕ ਨਹੀਂ ਹਾਂ',        text: 'main theek nahin hoon' },
    { label: 'ਮੈਨੂੰ ਨਰਸ ਚਾਹੀਦੀ',       text: 'mujhe nurse chahiye' },
    { label: 'ਪਰਿਵਾਰ ਨੂੰ ਬੁਲਾਓ',       text: 'family ko bulao' },
    { label: 'ਦਵਾਈ ਯਾਦ ਕਰਾਓ',         text: 'medicine yaad dilao' },
    { label: 'ਮੇਰੇ ਨਾਲ ਗੱਲ ਕਰੋ',       text: 'baat karo mere saath' },
    { label: 'ਮੇਰੀ ਸਿਹਤ ਕਿਵੇਂ ਹੈ',      text: 'meri sehat kaisi hai' },
    { label: 'ਮੈਨੂੰ ਰਸੋਈਆ ਚਾਹੀਦਾ',     text: 'mujhe cook chahiye' },
  ],
}

export default function QuickChips({ onChipSelect, language = 'hi' }) {
  const chips = CHIPS[language] || CHIPS.hi

  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      gap: 8,
      padding: '12px 16px',
      borderTop: '1px solid #EEF4FB',
      background: 'white',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
    }}>
      {chips.map((chip, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChipSelect(chip.text)}
          style={{
            flexShrink: 0,
            height: 40,
            padding: '0 16px',
            background: '#F7FBFF',
            border: '1.5px solid #DDE8F5',
            borderRadius: 30,
            fontSize: 13,
            fontWeight: 700,
            color: '#0A2540',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            fontFamily: 'Noto Sans, sans-serif',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#1D9E75'
            e.currentTarget.style.background = '#F0FBF7'
            e.currentTarget.style.color = '#1D9E75'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#DDE8F5'
            e.currentTarget.style.background = '#F7FBFF'
            e.currentTarget.style.color = '#0A2540'
          }}
        >
          {chip.label}
        </button>
      ))}

      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

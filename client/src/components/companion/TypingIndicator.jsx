export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16, padding: '0 16px' }}>
      {/* Sahara label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', background: '#1D9E75',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', fontFamily: 'Noto Sans, sans-serif' }}>Sahara</span>
      </div>

      {/* Dots bubble */}
      <div style={{
        width: 60,
        background: 'white',
        border: '1px solid #DDE8F5',
        borderRadius: '18px 18px 18px 4px',
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {[0, 150, 300].map((delay, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#A0B8D0',
            animation: `typingBounce 1.2s infinite`,
            animationDelay: `${delay}ms`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

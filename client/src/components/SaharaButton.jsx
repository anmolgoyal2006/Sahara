const VARIANTS = {
  primary: {
    background: '#1D9E75',
    color: 'white',
    border: 'none',
    hoverBg: '#0F6E56',
  },
  blue: {
    background: '#185FA5',
    color: 'white',
    border: 'none',
    hoverBg: '#134d87',
  },
  outline: {
    background: 'white',
    color: '#1D9E75',
    border: '2px solid #1D9E75',
    hoverBg: '#F0FBF7',
  },
  danger: {
    background: 'white',
    color: '#E24B4A',
    border: '2px solid #E24B4A',
    hoverBg: '#FFF0F0',
  },
  light: {
    background: '#EBF4FF',
    color: '#185FA5',
    border: 'none',
    hoverBg: '#DDE8F5',
  },
}

const SIZES = {
  lg: { height: 52, fontSize: 15 },
  md: { height: 44, fontSize: 13 },
  sm: { height: 36, fontSize: 12 },
}

export default function SaharaButton({
  loading,
  disabled,
  loadingText,
  onClick,
  variant = 'primary',
  children,
  fullWidth,
  size = 'lg',
}) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.lg
  const isDisabled = disabled || loading

  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: s.height,
        padding: '0 24px',
        width: fullWidth ? '100%' : undefined,
        background: isDisabled
          ? loading
            ? (variant === 'primary' ? '#5AC9A8' : variant === 'blue' ? '#6B9FCC' : v.background)
            : '#DDE8F5'
          : v.background,
        color: isDisabled && !loading ? '#A0B8D0' : v.color,
        border: isDisabled && !loading ? '2px solid #DDE8F5' : (v.border || 'none'),
        borderRadius: 10,
        fontSize: s.fontSize,
        fontWeight: 700,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        opacity: loading ? 0.85 : 1,
        transition: 'background 0.15s, opacity 0.15s',
        outline: 'none',
      }}
    >
      {loading ? (
        <>
          <span className="spinner" />
          {loadingText || 'Loading...'}
        </>
      ) : (
        children
      )}
    </button>
  )
}

import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#F8FAF9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'inherit',
      }}
    >
      <i
        className="ti ti-alert-circle"
        style={{ fontSize: '48px', color: '#1D9E75', marginBottom: '16px' }}
        aria-hidden="true"
      />
      <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111111', marginBottom: '8px' }}>
        Page not found
      </h1>
      <p style={{ fontSize: '18px', color: '#555555', marginBottom: '24px' }}>
        This page does not exist.
      </p>
      <Link
        href="/login"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          height: '56px',
          padding: '0 32px',
          backgroundColor: '#1D9E75',
          color: 'white',
          fontSize: '18px',
          fontWeight: '700',
          borderRadius: '12px',
          textDecoration: 'none',
        }}
      >
        <i className="ti ti-home" style={{ fontSize: '18px' }} aria-hidden="true" />
        Go to Login
      </Link>
    </div>
  )
}

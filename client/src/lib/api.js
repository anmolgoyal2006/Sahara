const BASE = import.meta.env.VITE_API_URL || ''

export async function checkUser(user_id) {
  const res = await fetch(`${BASE}/api/auth/check-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  })
  return res.json()
}

export async function createUser(payload) {
  const res = await fetch(`${BASE}/api/auth/create-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function findElder(phone) {
  const res = await fetch(`${BASE}/api/auth/find-elder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  return res.json()
}

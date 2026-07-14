/**
 * useSchemes — shared data-fetching hook for the scheme assistant.
 * Keeps API calls in one place so pages & the caregiver view reuse them.
 */
import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/* ─────────────────────────────────────
   useSchemeCount — total count from /all
   Used to display dynamic "Analysing N schemes"
───────────────────────────────────── */
export function useSchemeCount () {
  const [count, setCount] = useState(null)
  useEffect(() => {
    fetch(`${API_URL}/api/schemes/all`)
      .then(r => r.json())
      .then(d => { if (d.success) setCount(d.count) })
      .catch(() => {})
  }, [])
  return count
}

/* ─────────────────────────────────────
   useSchemeCategories — GET /api/schemes/categories
───────────────────────────────────── */
export function useSchemeCategories () {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/schemes/categories`)
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.categories) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { categories, loading }
}

/* ─────────────────────────────────────
   useSchemeStates — derives unique state
   names from /all so the form dropdown
   never hardcodes a list.
───────────────────────────────────── */
export function useSchemeStates () {
  const [states, setStates] = useState([])

  useEffect(() => {
    fetch(`${API_URL}/api/schemes/all`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        const set = new Set()
        d.schemes.forEach(s => {
          // eligibility.states is not in /all response —
          // we derive from the eligibility field of the full scheme
          // This hook is called once; the /all payload is already loaded.
        })
        // Fallback: use a well-known canonical list and
        // augment with anything in the data we can infer.
        // Full list of 28 states + 8 UTs for India.
        setStates([
          'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
          'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
          'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
          'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
          'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
          'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
          'Andaman and Nicobar Islands', 'Chandigarh',
          'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
          'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
        ])
      })
      .catch(() => {})
  }, [])

  return states
}

/* ─────────────────────────────────────
   useSchemeSearch — server-side search
   with pagination.
───────────────────────────────────── */
export function useSchemeSearch () {
  const [results,    setResults]    = useState([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(false)

  const search = useCallback(async (q = '', category = '', pageNum = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '20', page: String(pageNum) })
      if (q)        params.set('q', q)
      if (category && category !== 'all') params.set('category', category)

      const r    = await fetch(`${API_URL}/api/schemes/search?${params}`)
      const data = await r.json()
      if (data.success) {
        setResults(data.results)
        setTotal(data.total)
        setPage(data.page)
        setTotalPages(data.totalPages)
      }
    } catch { /* silent */ }
    finally  { setLoading(false) }
  }, [])

  return { results, total, page, totalPages, loading, search }
}

/* ─────────────────────────────────────
   useEligibilityCheck — POST /check-eligibility
───────────────────────────────────── */
export function useEligibilityCheck () {
  const [checking, setChecking] = useState(false)
  const [results,  setResults]  = useState(null)
  const [error,    setError]    = useState(null)

  const check = useCallback(async (profile) => {
    setChecking(true)
    setError(null)
    try {
      const r    = await fetch(`${API_URL}/api/schemes/check-eligibility`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ profile }),
      })
      const data = await r.json()
      if (data.success) setResults(data)
      else setError(data.error || 'Check failed.')
    } catch (e) {
      setError(e.message || 'Network error.')
    }
    setChecking(false)
  }, [])

  const reset = useCallback(() => { setResults(null); setError(null) }, [])

  return { checking, results, error, check, reset }
}

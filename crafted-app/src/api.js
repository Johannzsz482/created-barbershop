import { useSyncExternalStore } from 'react'

// ---------------------------------------------------------------------------
// Talks to the Spring Boot backend and keeps one shared copy of the data.
// In development, requests go through the Vite proxy (/api -> localhost:8080).
// For a deployed site, set VITE_API_URL (for example https://crafted-api.onrender.com).
// ---------------------------------------------------------------------------
const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'crafted_token'

// Uploaded pictures are saved by the backend and come back as /uploads/... paths. Point them at the backend
// (matters when the site is deployed away from it); local /assets/... images stay on the frontend.
export const fileUrl = (p) => (p && p.startsWith('/uploads/') ? BASE + p : p)

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t) => {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

// The database stores UPPER_SNAKE values (ADMIN, IN_PROGRESS, MONDAY); the pages use Title Case.
// Convert in this one place so no page has to change.
const title = (s) => (s ? s.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : s)
export const toDb = (s) => (s ? s.trim().toUpperCase().replace(/ /g, '_') : s)

function normalize(d) {
  return {
    ...d,
    users: d.users.map((u) => ({ ...u, role: title(u.role) })),
    schedules: d.schedules.map((s) => ({ ...s, day_of_week: title(s.day_of_week) })),
    appointments: d.appointments.map((a) => ({ ...a, status: title(a.status) })),
    logs: d.logs.map((l) => ({ ...l, old_status: title(l.old_status), new_status: title(l.new_status) })),
  }
}

// ---- shared store ----
let state = {
  ready: false, offline: false,
  users: [], barbers: [], services: [], schedules: [], barberServices: [], appointments: [], logs: [],
}
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
export const getState = () => state
export const patch = (fn) => { state = fn(state); emit() }
export function useStore() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => state)
}

// Reload everything from the server (what you are allowed to see depends on who is signed in)
export async function refresh() {
  const r = await api('/bootstrap')
  if (r.ok) state = { ...normalize(r.data), ready: true, offline: false }
  else state = { ...state, ready: true, offline: state.barbers.length === 0 }
  emit()
  return r.ok
}

// Reload only the signed-in user's own appointments (GET /api/appointments/my) into the shared store
export async function refreshMine() {
  const r = await api('/appointments/my')
  if (!r.ok || !Array.isArray(r.data)) return false
  const mine = r.data.map((a) => ({ ...a, status: title(a.status) }))
  const ids = new Set(mine.map((a) => a.appointment_id))
  patch((s) => ({ ...s, appointments: [...s.appointments.filter((a) => !ids.has(a.appointment_id)), ...mine] }))
  return true
}

// ---- requests ----
export async function api(path, method = 'GET', body) {
  const token = getToken()
  const headers = {}
  const isForm = body instanceof FormData   // a file upload: the browser sets its own Content-Type
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) })
  } catch {
    return { ok: false, status: 0, data: null, error: 'Cannot reach the server. Is the backend running?' }
  }
  let data = null
  try { data = await res.json() } catch { /* empty body */ }
  // A 401 on a protected call means the login expired
  if (res.status === 401 && token && !path.startsWith('/auth/')) {
    setToken(null)
    refresh()
    return { ok: false, status: 401, data, error: 'Your session expired. Please sign in again.' }
  }
  return { ok: res.ok, status: res.status, data, error: data?.error }
}

// Change something on the server, show errors, then reload. "optimistic" updates the screen straight away.
export async function act(path, method, body, optimistic) {
  if (optimistic) patch(optimistic)
  const r = await api(path, method, body)
  if (!r.ok) window.alert(r.error || 'Something went wrong.')
  await refresh()
  return r
}

refresh()

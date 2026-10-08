import { createContext, useContext, useState } from 'react'
import { api, setToken, refresh, getState, patch, useStore } from '../api'

const AuthContext = createContext(null)

const getSession = () => { try { return JSON.parse(localStorage.getItem('crafted_session')) } catch { return null } }
const setSession = (id) => {
  try { if (id == null) localStorage.removeItem('crafted_session'); else localStorage.setItem('crafted_session', JSON.stringify(id)) } catch { /* ignore */ }
}

// Accounts and sign-in now live in the database; the backend checks passwords and hands out a login token.
export function AuthProvider({ children }) {
  const store = useStore()
  const [userId, setUserId] = useState(getSession)

  // The password hash never leaves the server; this placeholder is only so the profile can show stars
  const users = store.users.filter((u) => u.is_active).map((u) => ({ ...u, password: '••••••••' }))
  const user = users.find((u) => u.users_id === userId) ?? null
  // A barber's public profile (the one the website shows); null for customers, admins and unlinked accounts
  const myBarber = user?.role === 'Barber' ? store.barbers.find((b) => b.user_id === user.users_id) ?? null : null

  const begin = async (data) => {
    setToken(data.token); setSession(data.user.users_id); setUserId(data.user.users_id)
    await refresh()
    const me = getState().users.find((u) => u.users_id === data.user.users_id)
    return { ok: true, user: me ?? data.user }
  }

  const login = async (identity, password) => {
    const r = await api('/auth/login', 'POST', { identity, password })
    return r.ok ? begin(r.data) : { ok: false, error: r.error || 'Could not sign in.', field: r.data?.field }
  }

  const signup = async (f) => {
    let { firstName, lastName } = f
    if (firstName === undefined) {          // older form: one "name" box, split at the last space
      const parts = (f.name || '').trim().split(/\s+/)
      lastName = parts.length > 1 ? parts.pop() : ''
      firstName = parts.join(' ')
    }
    const r = await api('/auth/register', 'POST', {
      firstName, lastName, username: f.username, email: f.email, phone: f.phone || '', password: f.password,
    })
    return r.ok ? begin(r.data) : { ok: false, error: r.error || 'Could not create the account.', field: r.data?.field }
  }

  const logout = () => { setToken(null); setSession(null); setUserId(null); refresh() }

  const changePassword = async (current, next) => {
    const r = await api(`/users/${userId}/password`, 'PUT', { current, next })
    return r.ok ? { ok: true } : { ok: false, error: r.error || 'Could not change the password.' }
  }

  // Save my first name, last name, username, email and phone; the backend sends back what it stored
  const updateProfile = async (fields) => {
    const r = await api(`/users/${userId}`, 'PUT', fields)
    if (!r.ok) return { ok: false, error: r.error || 'Could not save your profile.', field: r.data?.field }
    patch((s) => ({
      ...s,
      users: s.users.map((u) => (u.users_id === userId ? { ...u, ...r.data } : u)),
      // a barber's name is copied to their public profile by the backend; mirror it here
      barbers: user?.role === 'Barber'
        ? s.barbers.map((b) => (b.user_id === userId ? { ...b, first_name: r.data.first_name, last_name: r.data.last_name } : b))
        : s.barbers,
    }))
    return { ok: true }
  }

  // Show a new picture (or none) straight away. A barber's picture is the public barber photo; others use their user.
  const showPhoto = (url) => patch((s) => (user?.role === 'Barber'
    ? { ...s, barbers: s.barbers.map((b) => (b.user_id === userId ? { ...b, photo_url: url } : b)) }
    : { ...s, users: s.users.map((u) => (u.users_id === userId ? { ...u, photo_url: url } : u)) }))

  // Upload (or replace) my profile picture; the backend checks the file and sends back its /uploads/... path
  const changePhoto = async (file) => {
    const form = new FormData()
    form.append('file', file)
    const r = await api(`/users/${userId}/photo`, 'PUT', form)
    if (!r.ok) return { ok: false, error: r.error || 'Could not change the picture.' }
    showPhoto(r.data.photo_url)
    return { ok: true }
  }

  const removePhoto = async () => {
    const r = await api(`/users/${userId}/photo`, 'DELETE')
    if (!r.ok) return { ok: false, error: r.error || 'Could not remove the picture.' }
    showPhoto(null)
    return { ok: true }
  }

  const deleteAccount = async (password) => {
    const r = await api(`/users/${userId}`, 'DELETE', { password })
    if (!r.ok) return { ok: false, error: r.error || 'Could not delete the account.' }
    logout()
    return { ok: true }
  }

  // Wait for the first load so a signed-in person is not bounced to the sign-in page
  if (!store.ready) return <p style={{ padding: 40, textAlign: 'center' }}>Loading…</p>
  if (store.offline) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Cannot reach the server. Make sure the backend is running.</p>
        <button type="button" onClick={refresh}>Try again</button>
      </div>
    )
  }

  return <AuthContext.Provider value={{ user, myBarber, users, login, signup, logout, changePassword, updateProfile, changePhoto, removePhoto, deleteAccount }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
export const homeFor = (role) => (role === 'Admin' ? '/admin' : role === 'Barber' ? '/dashboard' : '/')
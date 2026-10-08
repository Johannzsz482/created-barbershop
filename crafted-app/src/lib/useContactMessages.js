import { useEffect, useState } from 'react'
import { api } from '../api'

// Admin contact messages: GET /api/admin/contact-messages (uses the signed-in token via api()).
// Returns { messages, loading, error, markRead }; messages are { message_id, name, email, message, created_at, is_read }.
// markRead(id) flips the message to Read straight away, then calls PATCH /api/admin/contact-messages/{id}/read (and undoes it if that fails).
export function useContactMessages() {
  const [result, setResult] = useState({ done: false, messages: [], error: '' })

  useEffect(() => {
    let stale = false
    api('/admin/contact-messages').then((r) => {
      if (stale) return
      if (!r.ok || !Array.isArray(r.data)) {
        setResult({ done: true, messages: [], error: r.error || 'Could not load messages.' })
        return
      }
      setResult({ done: true, messages: r.data, error: '' })
    })
    return () => { stale = true }
  }, [])

  const setRead = (id, is_read) => setResult((r) => ({ ...r, messages: r.messages.map((m) => (m.message_id === id ? { ...m, is_read } : m)) }))

  const markRead = async (id) => {
    const m = result.messages.find((x) => x.message_id === id)
    if (!m || m.is_read) return
    setRead(id, true)
    const r = await api(`/admin/contact-messages/${id}/read`, 'PATCH')
    if (!r.ok) {
      setRead(id, false)
      window.alert(r.error || 'Could not mark the message as read.')
    }
  }

  return { messages: result.messages, loading: !result.done, error: result.error, markRead }
}

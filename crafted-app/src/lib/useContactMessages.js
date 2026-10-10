import { useEffect, useState } from 'react'
import { api, setUnreadMessages } from '../api'

// Admin contact messages: GET /api/admin/contact-messages (uses the signed-in token via api()).
// Returns { messages, loading, error, markRead }; messages are { message_id, name, email, message, created_at, is_read }.
// Rows also carry user_id, phone, username (set for messages from signed-in people) and reply / replied_at.
// reply(id, text) calls POST /api/admin/contact-messages/{id}/reply; remove(id) calls DELETE /api/admin/contact-messages/{id}.
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

  // Keep the Admin header / tab badge in step with this list (loading, marking read, replying, deleting)
  useEffect(() => {
    if (result.done && !result.error) setUnreadMessages(result.messages.filter((m) => !m.is_read).length)
  }, [result])

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

  // Returns '' on success or an error message (shown by the caller next to the reply box)
  const reply = async (id, text) => {
    const r = await api(`/admin/contact-messages/${id}/reply`, 'POST', { reply: text })
    if (!r.ok) return r.error || 'Could not send the reply.'
    const now = new Date()
    const p = (n) => String(n).padStart(2, '0')
    const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`
    setResult((x) => ({ ...x, messages: x.messages.map((m) => (m.message_id === id ? { ...m, reply: text.trim(), replied_at: stamp, is_read: true } : m)) }))
    return ''
  }

  const remove = async (id) => {
    const r = await api(`/admin/contact-messages/${id}`, 'DELETE')
    if (!r.ok && r.status !== 404) {
      window.alert(r.error || 'Could not delete the message.')
      return
    }
    setResult((x) => ({ ...x, messages: x.messages.filter((m) => m.message_id !== id) }))
  }

  return { messages: result.messages, loading: !result.done, error: result.error, markRead, reply, remove }
}

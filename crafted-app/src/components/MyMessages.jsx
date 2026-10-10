import { useEffect, useState } from 'react'
import '../styles/messages.css'
import { api } from '../api'

// "My messages" (Profile): the signed-in person's own Contact Us messages and the admin's replies.
// Loads GET /api/contact/my each time it is shown.
export default function MyMessages() {
  const [res, setRes] = useState({ done: false, rows: [], error: '' })

  useEffect(() => {
    let stale = false
    api('/contact/my').then((r) => {
      if (stale) return
      setRes(r.ok && Array.isArray(r.data) ? { done: true, rows: r.data, error: '' } : { done: true, rows: [], error: r.error || 'Could not load your messages.' })
    })
    return () => { stale = true }
  }, [])

  if (!res.done) return <p className="muted center">Loading…</p>
  if (res.error) return <p className="muted center warn">{res.error}</p>
  if (res.rows.length === 0) return <p className="muted center">You haven&rsquo;t sent any messages yet.</p>

  return (
    <div className="stack my-msgs">
      {res.rows.map((m) => (
        <div key={m.message_id} className="my-msg">
          <small className="muted">You · {m.created_at}</small>
          <p className="my-msg-body">{m.message}</p>
          {m.reply
            ? <div className="my-msg-reply"><small className="muted">Reply from CRAFTED · {m.replied_at}</small><p className="my-msg-body">{m.reply}</p></div>
            : <small className="muted">No reply yet.</small>}
        </div>
      ))}
    </div>
  )
}

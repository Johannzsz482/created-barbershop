import { useEffect, useState } from 'react'
import '../styles/messages.css'
import { api, markRepliesSeen } from '../api'
import { useAuth } from '../context/AuthContext'

// "My messages" (Profile): the signed-in person's own Contact Us messages and the admin's replies.
// Loads GET /api/contact/my each time it is shown. Replies the person had not opened before are tagged "New",
// and showing them clears the unread badge on the header icon and the My messages button.
export default function MyMessages() {
  const { user } = useAuth()
  const uid = user.users_id
  const [res, setRes] = useState({ done: false, rows: [], error: '', fresh: new Set() })

  useEffect(() => {
    let stale = false
    api('/contact/my').then((r) => {
      if (stale) return
      if (!r.ok || !Array.isArray(r.data)) return setRes({ done: true, rows: [], error: r.error || 'Could not load your messages.', fresh: new Set() })
      const fresh = new Set(markRepliesSeen(uid, r.data).map((m) => m.message_id))
      setRes({ done: true, rows: r.data, error: '', fresh })
    })
    return () => { stale = true }
  }, [uid])

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
            ? <div className="my-msg-reply"><small className="muted">Reply from CRAFTED · {m.replied_at}</small>{res.fresh.has(m.message_id) && <span className="notif-badge">New</span>}<p className="my-msg-body">{m.reply}</p></div>
            : <small className="muted">No reply yet.</small>}
        </div>
      ))}
    </div>
  )
}

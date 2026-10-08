import { useState } from 'react'
import { longDate, fmt12 } from '../lib/time'
import '../styles/messages.css'

// Admin "Messages" tab. Presentational only: it shows whatever list it is given.
// To connect it later, pass the rows from the contact-message GET endpoint as `messages`
// (shape used here: { message_id, name, email, message, created_at, is_read }), plus `loading` / `error` if wanted.
// `onMarkRead(id)` is called when an unread message is clicked.
const FILTERS = ['All', 'Unread', 'Read']

// "2026-10-08 14:30" or "2026-10-08T14:30:00" -> { date, time }
function when(ts) {
  if (!ts) return { date: '—', time: '' }
  const [d, t] = String(ts).replace('T', ' ').split(' ')
  return { date: longDate(d), time: t ? fmt12(t.slice(0, 5)) : '' }
}

export default function ContactMessages({ messages = [], loading = false, error = '', onMarkRead }) {
  const [filter, setFilter] = useState('All')
  const unread = messages.filter((m) => !m.is_read).length
  const rows = messages.filter((m) => filter === 'All' || (filter === 'Unread' ? !m.is_read : m.is_read))

  return (
    <div className="panel">
      <div className="toolbar">
        <span className="muted">{messages.length} {messages.length === 1 ? 'message' : 'messages'} · {unread} unread</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter messages">{FILTERS.map((f) => <option key={f}>{f}</option>)}</select>
      </div>

      {loading && <p className="muted center">Loading messages…</p>}
      {error && <p className="muted center warn">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="muted center msg-empty">{messages.length === 0 ? 'No messages available.' : 'No messages match this filter.'}</p>
      )}

      {rows.length > 0 && (
        <div className="table-wrap"><table className="tbl left msg-tbl">
          <thead><tr><th>Sender</th><th>Email</th><th>Message</th><th>Received</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((m) => {
              const w = when(m.created_at)
              return (
                <tr key={m.message_id} className={m.is_read ? '' : 'unread'} onClick={!m.is_read && onMarkRead ? () => onMarkRead(m.message_id) : undefined}>
                  <td className="msg-name">{m.name}</td>
                  <td><a href={`mailto:${m.email}`}>{m.email}</a></td>
                  <td className="msg-body">{m.message}</td>
                  <td>{w.date}{w.time && <><br /><small>{w.time}</small></>}</td>
                  <td>
                    <span className={`badge ${m.is_read ? 's-completed' : 's-confirmed'}`}>{m.is_read ? 'Read' : 'Unread'}</span>
                    {!m.is_read && onMarkRead && <><br /><button type="button" className="mini ghost msg-mark" onClick={(e) => { e.stopPropagation(); onMarkRead(m.message_id) }}>Mark as read</button></>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      )}
    </div>
  )
}

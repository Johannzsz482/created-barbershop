import { useState } from 'react'
import { longDate, fmt12 } from '../lib/time'
import '../styles/messages.css'

// Admin "Messages" tab. Presentational only: it shows whatever list it is given.
// To connect it later, pass the rows from the contact-message GET endpoint as `messages`
// (shape used here: { message_id, name, email, message, created_at, is_read }), plus `loading` / `error` if wanted.
// `onMarkRead(id)` is called when an unread message is clicked.
// `onReply(id, text)` (resolves to '' or an error message) and `onDelete(id)` add the Reply / Delete buttons.
// Messages from signed-in people (user_id set) can be replied to; the reply shows in that person's account.
const FILTERS = ['All', 'Unread', 'Read']

// "2026-10-08 14:30" or "2026-10-08T14:30:00" -> { date, time }
function when(ts) {
  if (!ts) return { date: '—', time: '' }
  const [d, t] = String(ts).replace('T', ' ').split(' ')
  return { date: longDate(d), time: t ? fmt12(t.slice(0, 5)) : '' }
}

export default function ContactMessages({ messages = [], loading = false, error = '', onMarkRead, onReply, onDelete }) {
  const [filter, setFilter] = useState('All')
  const [replyId, setReplyId] = useState(null)   // the message whose reply box is open
  const [draft, setDraft] = useState('')
  const [replyError, setReplyError] = useState('')
  const [busy, setBusy] = useState(false)

  const openReply = (m) => { setReplyId(m.message_id); setDraft(m.reply || ''); setReplyError('') }
  const sendReply = async (m) => {
    if (!draft.trim()) { setReplyError('Write a reply first.'); return }
    setBusy(true)
    const err = await onReply(m.message_id, draft)
    setBusy(false)
    if (err) setReplyError(err)
    else setReplyId(null)
  }
  const del = (m) => {
    if (window.confirm(`Delete the message from ${m.name}? This can't be undone.`)) onDelete(m.message_id)
  }
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
          <thead><tr><th>Sender</th><th>Contact</th><th>Message</th><th>Received</th><th>Status</th>{(onReply || onDelete) && <th>Actions</th>}</tr></thead>
          <tbody>
            {rows.map((m) => {
              const w = when(m.created_at)
              return (
                <tr key={m.message_id} className={m.is_read ? '' : 'unread'} onClick={!m.is_read && onMarkRead ? () => onMarkRead(m.message_id) : undefined}>
                  <td className="msg-name">{m.name}{m.username && <><br /><small className="muted">@{m.username}</small></>}</td>
                  <td>
                    {m.email && <a href={`mailto:${m.email}`} onClick={(e) => e.stopPropagation()}>{m.email}</a>}
                    {m.email && m.phone && <br />}
                    {m.phone && <a href={`tel:${m.phone.replace(/[^0-9+]/g, '')}`} onClick={(e) => e.stopPropagation()}>{m.phone}</a>}
                  </td>
                  <td className="msg-body">
                    {m.message}
                    {m.reply && replyId !== m.message_id && <div className="msg-reply"><small className="muted">Your reply{m.replied_at ? ` · ${m.replied_at}` : ''}</small><br />{m.reply}</div>}
                    {replyId === m.message_id && (
                      <div className="msg-reply-box" onClick={(e) => e.stopPropagation()}>
                        <textarea value={draft} maxLength={2000} rows={4} aria-label={`Reply to ${m.name}`} placeholder="Write your reply…" onChange={(e) => { setDraft(e.target.value); setReplyError('') }} />
                        {replyError && <p className="muted warn">{replyError}</p>}
                        <button type="button" className="mini" disabled={busy} onClick={() => sendReply(m)}>{busy ? 'Sending…' : 'Send reply'}</button>{' '}
                        <button type="button" className="mini ghost" disabled={busy} onClick={() => setReplyId(null)}>Cancel</button>
                      </div>
                    )}
                  </td>
                  <td>{w.date}{w.time && <><br /><small>{w.time}</small></>}</td>
                  <td>
                    <span className={`badge ${m.is_read ? 's-completed' : 's-confirmed'}`}>{m.is_read ? 'Read' : 'Unread'}</span>
                    {!m.is_read && onMarkRead && <><br /><button type="button" className="mini ghost msg-mark" onClick={(e) => { e.stopPropagation(); onMarkRead(m.message_id) }}>Mark as read</button></>}
                  </td>
                  {(onReply || onDelete) && (
                    <td className="msg-actions">
                      {onReply && (m.user_id
                        ? <button type="button" className="mini" onClick={(e) => { e.stopPropagation(); openReply(m) }}>{m.reply ? 'Edit reply' : 'Reply'}</button>
                        : <small className="muted">Guest: reply by email or phone</small>)}
                      {onDelete && <><br /><button type="button" className="mini ghost msg-del" onClick={(e) => { e.stopPropagation(); del(m) }}>Delete</button></>}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table></div>
      )}
    </div>
  )
}
